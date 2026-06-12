import json
import asyncio
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse
from backend.app.core.security import verify_firebase_token
from backend.app.core.logging import get_logger
from backend.app.core.config import settings
from redis.asyncio import Redis

router = APIRouter(prefix="/sse", tags=["websocket_fallback_sse"])
logger = get_logger("sse_route")

@router.get("/{swarm_run_id}")
async def sse_endpoint(
    request: Request, swarm_run_id: str, token: str = Query(...)
):
    """
    Fallback SSE endpoint that uses the same /ws/ UUID path to maintain compatibility.
    Subscribes client to live events.
    """
    try:
        await verify_firebase_token(token)
    except Exception as e:
        from backend.app.core.config import settings as _s
        if _s.ENVIRONMENT != "development":
            logger.warning(f"SSE upgrade rejected: Invalid credentials. Error: {str(e)}")
            return {"error": "Invalid credentials"}
        logger.warning(f"Dev mode: ignoring SSE auth error: {str(e)}")

    logger.info(f"SSE subscription accepted for swarm run: {swarm_run_id}")

    async def event_generator():
        # Yield an initial comment to force proxy to flush headers
        yield ": connected\n\n"
        
        redis_client = Redis.from_url(settings.REDIS_URL)
        stream = "ws_events"
        last_id = "0-0"
        
        try:
            while True:
                if await request.is_disconnected():
                    logger.info(f"Client disconnected from SSE stream: {swarm_run_id}")
                    break

                messages = await redis_client.xread(
                    streams={stream: last_id},
                    count=20,
                    block=500,
                )

                if messages:
                    for stream_name, msg_list in messages:
                        for msg_id, payload in msg_list:
                            last_id = msg_id
                            try:
                                data = json.loads(payload[b"data"])
                            except Exception:
                                continue

                            if data.get("swarm_run_id") == swarm_run_id:
                                # SSE format: data: <json>\n\n
                                yield f"data: {json.dumps(data)}\n\n"
                                
                                if data.get("type") in ("SWARM_COMPLETED", "SWARM_FAILED"):
                                    logger.info(f"Run {swarm_run_id} finished — closing SSE.")
                                    await asyncio.sleep(1.0) # Give proxy time to flush
                                    return

                await asyncio.sleep(0.05)
        except Exception as e:
            logger.error(f"SSE execution error: {str(e)}", exc_info=True)
        finally:
            try:
                await redis_client.aclose()
            except:
                pass

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
