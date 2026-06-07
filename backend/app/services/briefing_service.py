# Implemented by: workstream/7-integration
from redis.asyncio import Redis
from backend.app.core.event_bus import EventBus
from backend.app.core.config import settings


class BriefingService:
    async def enqueue_briefing(self, swarm_run_id: str, output_summary: str) -> None:
        """Formats, truncates text to 500 words, and enqueues to tts_queue stream."""
        # 1. Truncate for audio brevity (500 words ceiling limit)
        words = output_summary.split()
        truncated_text = " ".join(words[:500])
        if len(words) > 500:
            truncated_text += " ... End of summary briefing."

        # 2. Publish to tts_queue stream
        redis_client = Redis.from_url(settings.REDIS_URL)
        event_bus = EventBus(redis_client)
        await event_bus.publish(
            "tts_queue", {"swarm_run_id": swarm_run_id, "text": truncated_text}
        )
        await redis_client.aclose()
