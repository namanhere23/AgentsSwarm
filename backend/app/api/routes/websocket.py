# STUB-FILL — Implemented by: workstream/3b-websocket-reports
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.app.core.security import verify_firebase_token
from backend.app.core.logging import get_logger
from backend.app.core.config import settings
from redis.asyncio import Redis

router = APIRouter(prefix="/ws", tags=["websocket"])
logger = get_logger("websocket_route")


@router.websocket("/{swarm_run_id}")
async def websocket_endpoint(
    websocket: WebSocket, swarm_run_id: str, token: str = Query(...)
):
    """
    Subscribes client to live agentThought, taskCompleted and approval gate requests.
    Validates token from query parameters. Reconnect buffer group handles delivery.
    """
    # 1. Authenticate connection upgrade request
    try:
        await verify_firebase_token(token)
    except Exception as e:
        logger.warning(
            f"WebSocket upgrade rejected: Invalid credentials. Error: {str(e)}"
        )
        # Close with auth error code 4001
        await websocket.close(code=4001)
        return

    await websocket.accept()
    logger.info(f"WebSocket subscription accepted for swarm run: {swarm_run_id}")

    redis_client = Redis.from_url(settings.REDIS_URL)
    stream = "ws_events"
    group = f"ws_group_{swarm_run_id}"
    consumer = "client_browser"

    # Create consumer group to buffer reconnects (read from last delivered or pending)
    try:
        await redis_client.xgroup_create(stream, group, id="0", mkstream=True)
    except Exception:
        pass  # Group already exists

    try:
        while True:
            # Check for messages filtered by swarm_run_id (read pending first, then new)
            messages = await redis_client.xreadgroup(
                groupname=group,
                consumername=consumer,
                streams={stream: "0"},  # Read pending first
                count=10,
                block=100,
            )

            # If no pending items, read new
            if not messages:
                messages = await redis_client.xreadgroup(
                    groupname=group,
                    consumername=consumer,
                    streams={stream: ">"},  # Read new items
                    count=10,
                    block=1000,
                )

            for stream_name, msg_list in messages:
                for msg_id, payload in msg_list:
                    data = json.loads(payload[b"data"])

                    # Push only if related to current swarm run instance
                    if data.get("swarm_run_id") == swarm_run_id:
                        await websocket.send_json(data)

                    # Acknowledge delivery
                    await redis_client.xack(stream, group, msg_id)

            # Small heartbeat pause to prevent thread lock
            await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        logger.info(f"Client disconnected from WebSocket stream: {swarm_run_id}")
    except Exception as e:
        logger.error(f"WebSocket execution error: {str(e)}")
    finally:
        await redis_client.aclose()
