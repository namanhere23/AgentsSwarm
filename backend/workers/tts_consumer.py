# Implemented by: workstream/7-integration
import os
import asyncio
from pathlib import Path
from elevenlabs.client import ElevenLabs
from redis.asyncio import Redis
from fastapi.concurrency import run_in_threadpool
from backend.app.core.config import settings
from backend.app.core.event_bus import EventBus
from backend.app.core.logging import get_logger

logger = get_logger("tts_worker")


async def _process_tts_job(message: dict, client: ElevenLabs, redis_client: Redis, event_bus: EventBus):
    """Process a single TTS job as a background task (non-blocking)."""
    swarm_run_id = message.get("swarm_run_id")
    text = message.get("text")
    msg_id = message.get("_msg_id")

    if not swarm_run_id or not text:
        logger.warning("TTS job missing swarm_run_id or text, skipping.")
        return

    workspace_root = Path(settings.WORKSPACE_DIR).resolve()
    workspace_root.mkdir(parents=True, exist_ok=True)
    output_wav_path = workspace_root / f"{swarm_run_id}_briefing.wav"

    try:
        # ElevenLabs TTS is synchronous — run in threadpool to avoid blocking event loop
        def _synthesize():
            return client.text_to_speech.convert(
                voice_id=os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBcs6BaNtIGlogV"),
                text=text,
                model_id="eleven_turbo_v2_5",
            )

        audio = await run_in_threadpool(_synthesize)

        def _write_audio():
            with open(output_wav_path, "wb") as f:
                for chunk in audio:
                    if chunk:
                        f.write(chunk)

        await run_in_threadpool(_write_audio)
        logger.info(f"Speech briefing generated at: {output_wav_path}")

        # Emit WebSocket BRIEFING_READY event
        await event_bus.publish(
            "ws_events",
            {
                "type": "BRIEFING_READY",
                "swarm_run_id": swarm_run_id,
                "data": {"audio_url": f"/workspace/{swarm_run_id}_briefing.wav"},
            },
        )

        # Acknowledge Redis queue message
        if msg_id:
            await redis_client.xack("tts_queue", "tts_worker_group", msg_id)
            logger.info(f"Acknowledged TTS message {msg_id}")

    except Exception as e:
        logger.error(f"TTS compilation failed for {swarm_run_id}: {str(e)}")


async def main():
    logger.info("Initializing Speech Briefing TTS worker...")

    client = ElevenLabs(api_key=os.environ.get("ELEVENLABS_API_KEY", ""))
    logger.info("ElevenLabs API client initialized.")

    redis_client = Redis.from_url(settings.REDIS_URL)
    event_bus = EventBus(redis_client)

    try:
        async for message in event_bus.consume(
            "tts_queue", "tts_worker_group", "tts_node_1"
        ):
            logger.info(f"Received briefing TTS task for run: {message.get('swarm_run_id')}")
            # Non-blocking: fire and forget, loop continues immediately
            asyncio.create_task(
                _process_tts_job(message, client, redis_client, event_bus)
            )
    finally:
        await redis_client.aclose()
        logger.info("TTS consumer shutdown complete.")


if __name__ == "__main__":
    asyncio.run(main())
