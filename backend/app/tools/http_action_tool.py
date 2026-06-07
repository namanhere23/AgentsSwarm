# STUB-FILL — Implemented by: workstream/4a-approval-gate
import os
import json
import httpx
from backend.app.tools.base import SwarmTool
from backend.app.services.approval_gate import approval_gate
from backend.app.core.event_bus import EventBus
from redis.asyncio import Redis
from backend.app.core.config import settings


class ActionRejected(Exception):
    def __init__(self, reason: str | None):
        super().__init__(f"Action mutation request rejected: {reason}")
        self.reason = reason


class HttpActionTool(SwarmTool):
    name = "HttpActionTool"
    description = (
        "Constructs and dispatches configurable HTTP requests to external REST APIs. "
        "ALL calls are intercepted by the Approval Gate before execution. "
        "Input: JSON string with {method, url, headers, body}."
    )

    def __init__(
        self, swarm_run_id: str = None, user_id: str = None, token: str = None
    ):
        super().__init__()
        self.swarm_run_id = swarm_run_id
        self.user_id = user_id
        self.token = token

    async def _run(self, input: str) -> str:
        if os.getenv("MOCK_TOOLS", "false").lower() == "true":
            return json.dumps({"status": 200, "body": {"mock": True}})

        if not self.swarm_run_id or not self.user_id or not self.token:
            return json.dumps({"error": "Auth context missing for HTTP Tool"})

        try:
            payload = json.loads(input)
        except Exception:
            return json.dumps({"error": "Invalid JSON format input"})

        # Initialize scoped database connectors
        from backend.app.core.supabase_client import get_supabase_client

        db_client = get_supabase_client(self.token)

        # 1. Register with approval gate BEFORE execution dispatch
        request_id = await approval_gate.create_approval_request(
            tool_name=self.name,
            proposed_payload=payload,
            risk_level="high",
            swarm_run_id=self.swarm_run_id,
            user_id=self.user_id,
            db_client=db_client,
        )

        # 2. Publish to WS event stream queue
        redis_client = Redis.from_url(settings.REDIS_URL)
        event_bus = EventBus(redis_client)
        await event_bus.publish(
            "ws_events",
            {
                "type": "APPROVAL_REQUESTED",
                "swarm_run_id": self.swarm_run_id,
                "data": {
                    "approval_request_id": request_id,
                    "tool_name": self.name,
                    "proposed_payload": payload,
                    "risk_level": "high",
                },
            },
        )
        await redis_client.aclose()

        # 3. Suspend thread coroutine lock
        result = await approval_gate.wait_for_approval(request_id)
        if result.status == "rejected":
            raise ActionRejected(reason=result.rejection_reason)

        # 4. Approved — Execute client dispatch
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=payload.get("method", "GET"),
                url=payload.get("url"),
                headers=payload.get("headers", {}),
                json=payload.get("body", {}),
                timeout=30.0,
            )

        # Log metrics is coordinated in downstream Phase 4B Audit logging wrapper
        return json.dumps({"status": response.status_code, "body": response.json()})
