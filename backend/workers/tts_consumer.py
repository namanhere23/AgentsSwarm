# Implemented by: workstream/7-integration
import os
import asyncio
from pathlib import Path
from elevenlabs.client import ElevenLabs
from redis.asyncio import Redis
from backend.app.core.config import settings
from backend.app.core.event_bus import EventBus
from backend.app.core.logging import get_logger

logger = get_logger("tts_worker")


async def main():
    logger.info("Initializing Speech Briefing TTS worker...")

    # Initialize ElevenLabs TTS client
    client = ElevenLabs(api_key=os.environ.get("ELEVENLABS_API_KEY", ""))
    logger.info("ElevenLabs API client initialized.")

    redis_client = Redis.from_url(settings.REDIS_URL)
    event_bus = EventBus(redis_client)

    async for message in event_bus.consume(
        "tts_queue", "tts_worker_group", "tts_node_1"
    ):
        logger.info(f"Received briefing TTS task: {message}")

        swarm_run_id = message.get("swarm_run_id")
        text = message.get("text")

        if not swarm_run_id or not text:
            continue

        workspace_root = Path(settings.WORKSPACE_DIR).resolve()
        workspace_root.mkdir(parents=True, exist_ok=True)
        output_wav_path = workspace_root / f"{swarm_run_id}_briefing.wav"

        # Compile speech WAV file synchronously (wrapped to prevent blocking loop)
        try:
            # ElevenLabs TTS synthesis
            audio = client.text_to_speech.convert(
                voice_id="JBFqnCBcs6BaNtIGlogV",  # Example Voice
                text=text,
                model_id="eleven_turbo_v2_5",
            )
            with open(output_wav_path, "wb") as f:
                for chunk in audio:
                    if chunk:
                        f.write(chunk)
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
            msg_id = message.get("_msg_id")
            if msg_id:
                await redis_client.xack("tts_queue", "tts_worker_group", msg_id)

        except Exception as e:
            logger.error(f"TTS compilation failed: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())
