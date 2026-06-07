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
        """Reads stream items via XREADGROUP or blocks on local Queue."""
        if self.redis_available:
            try:
                # Ensure group exists
                try:
                    await self.redis.xgroup_create(stream, group, mkstream=True)
                except Exception:
                    pass  # Group already exists

                while True:
                    messages = await self.redis.xreadgroup(
                        group, consumer, {stream: ">"}, count=1, block=1000
                    )
                    for stream_name, msg_list in messages:
                        for msg_id, payload in msg_list:
                            data = json.loads(payload[b"data"])
                            data["_msg_id"] = msg_id.decode()
                            yield data
            except Exception as e:
                logger.error(f"Redis consumer failed: {str(e)}")

        # Queue fallback
        if stream in self.fallbacks:
            while True:
                data = await self.fallbacks[stream].get()
                yield data
