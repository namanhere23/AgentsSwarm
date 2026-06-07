# STUB-FILL — Implemented by: workstream/4a-approval-gate
import asyncio
from typing import Dict
from backend.app.models.approval_models import ApprovalResult
from backend.app.memory.repository import SupabaseRepository


class ApprovalGate:
    def __init__(self):
        # Store live memory references to suspension locks
        self._events: Dict[str, asyncio.Event] = {}
        self._results: Dict[str, ApprovalResult] = {}

    async def create_approval_request(
        self,
        tool_name: str,
        proposed_payload: dict,
        risk_level: str,
        swarm_run_id: str,
        user_id: str,
        db_client,
    ) -> str:
        """Writes request record to PostgreSQL database and instantiates event suspension lock."""
        repo = SupabaseRepository()

        request_data = {
            "user_id": user_id,
            "swarm_run_id": swarm_run_id,
            "tool_name": tool_name,
            "proposed_payload": proposed_payload,
            "risk_level": risk_level,
            "status": "pending",
        }

        record = await repo.insert_approval_request(db_client, request_data)
        request_id = record["id"]

        # Instantiate coroutine suspension lock
        self._events[request_id] = asyncio.Event()
        return request_id

    async def wait_for_approval(self, approval_request_id: str) -> ApprovalResult:
        """Blocks execution until event signal sets, timing out after 1 hour."""
        event = self._events.get(approval_request_id)
        if not event:
            return ApprovalResult(status="rejected", rejection_reason="Lock not found")

        try:
            # 1 hour suspension ceiling limit
            await asyncio.wait_for(event.wait(), timeout=3600.0)
            result = self._results.get(approval_request_id)
            return result or ApprovalResult(
                status="rejected", rejection_reason="No output saved"
            )
        except asyncio.TimeoutError:
            return ApprovalResult(
                status="rejected", rejection_reason="Approval timeout limit hit"
            )
        finally:
            # Cleanup locks
            self._events.pop(approval_request_id, None)
            self._results.pop(approval_request_id, None)

    async def approve(self, approval_request_id: str, db_client) -> None:
        """Updates record status and unlocks the execution flow thread."""
        repo = SupabaseRepository()
        await repo.update_approval_request(db_client, approval_request_id, "approved")

        self._results[approval_request_id] = ApprovalResult(status="approved")
        event = self._events.get(approval_request_id)
        if event:
            event.set()

    async def reject(
        self, approval_request_id: str, reason: str | None, db_client
    ) -> None:
        """Updates record status with rejection payload, triggering agent replans."""
        repo = SupabaseRepository()
        await repo.update_approval_request(
            db_client, approval_request_id, "rejected", rejection_reason=reason
        )

        self._results[approval_request_id] = ApprovalResult(
            status="rejected", rejection_reason=reason
        )
        event = self._events.get(approval_request_id)
        if event:
            event.set()


# Singleton gate coordination manager instance
approval_gate = ApprovalGate()
