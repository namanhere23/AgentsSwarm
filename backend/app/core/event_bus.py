# STUB-FILL — Implemented by: workstream/1a-backend-core
import json
import asyncio
from typing import AsyncGenerator
from redis.asyncio import Redis
from backend.app.core.logging import get_logger

logger = get_logger("event_bus")


class EventBus:
    def __init__(self, redis_client: Redis = None):
        self.redis = redis_client
        self.redis_available = redis_client is not None
        self.fallbacks = {
            "swarm_queue": asyncio.Queue(),
            "agent_events": asyncio.Queue(),
            "ws_events": asyncio.Queue(),
        }

    async def publish(self, stream: str, data: dict) -> None:
        """Publish message via Redis Streams XADD or asyncio.Queue fallback."""
        payload = {"data": json.dumps(data)}
        if self.redis_available:
            try:
                await self.redis.xadd(stream, payload)
                return
            except Exception as e:
                logger.warning(f"Redis publish failed, falling back: {str(e)}")

        # Async Queue fallback
        if stream in self.fallbacks:
            await self.fallbacks[stream].put(data)

    async def consume(
        self, stream: str, group: str, consumer: str
    ) -> AsyncGenerator[dict, None]:
        """Reads stream items via XREADGROUP. Retries continuously on failure to ensure workers don't disconnect."""
        if not self.redis_available:
            # Fallback to in-memory queue only if Redis wasn't configured at startup
            if stream in self.fallbacks:
                while True:
                    data = await self.fallbacks[stream].get()
                    yield data
            return

        # Ensure group exists
        try:
            await self.redis.xgroup_create(stream, group, mkstream=True)
        except Exception:
            pass  # Group already exists

        while True:
            try:
                messages = await self.redis.xreadgroup(
                    group, consumer, {stream: ">"}, count=1, block=1000
                )
                for stream_name, msg_list in messages:
                    for msg_id, payload in msg_list:
                        data = json.loads(payload[b"data"])
                        data["_msg_id"] = msg_id.decode()
                        yield data
            except Exception as e:
                # If Redis connection drops, log the error and wait before retrying.
                # NEVER break the loop, otherwise the worker becomes permanently deaf.
                logger.error(f"Redis consumer connection error: {str(e)}. Retrying in 5 seconds...")
                await asyncio.sleep(5)
