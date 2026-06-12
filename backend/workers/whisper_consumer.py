# Implemented by: workstream/6a-voice-ingestion
import os
import uuid
import asyncio
import tempfile
import subprocess
from groq import AsyncGroq
import httpx
from redis.asyncio import Redis
from fastapi.concurrency import run_in_threadpool
from backend.app.core.config import settings
from backend.app.core.event_bus import EventBus
from backend.app.core.logging import get_logger

logger = get_logger("whisper_worker")


async def _process_stt_job(message: dict, groq_client: AsyncGroq, redis_client: Redis, event_bus: EventBus):
    """Process a single STT job as a background task (non-blocking)."""
    audio_path = message.get("audio_path")
    user_id = message.get("user_id")
    swarm_run_id = message.get("swarm_run_id")
    msg_id = message.get("_msg_id")

    if not audio_path or not os.path.exists(audio_path):
        logger.warning(f"Missing or non-existent audio path: {audio_path}")
        return

    logger.info(f"Audio found: {audio_path}. Converting with ffmpeg...")

    # 1. Downsample audio to 16kHz mono WAV — run in threadpool to not block loop
    temp_dir = tempfile.gettempdir()
    converted_wav = os.path.join(temp_dir, f"{uuid.uuid4()}.wav")
    try:
        await run_in_threadpool(
            subprocess.run,
            ["ffmpeg", "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", converted_wav],
            check=True,
            capture_output=True,
        )
        logger.info("ffmpeg conversion successful.")
    except Exception as e:
        logger.error(f"ffmpeg error: {str(e)}")
        # Clean up original
        if os.path.exists(audio_path):
            os.remove(audio_path)
        return

    try:
        # 2. Execute Groq Whisper transcription
        logger.info("Calling Groq Whisper STT...")
        with open(converted_wav, "rb") as file:
            transcription = await groq_client.audio.transcriptions.create(
                file=(converted_wav, file.read()),
                model="whisper-large-v3",
                response_format="json",
            )
        transcribed_text = transcription.text.strip()
        logger.info(f"Transcription complete: {transcribed_text[:80]}...")

        # 3. Update existing swarm run and push to swarm_queue
        if swarm_run_id:
            from backend.app.core.supabase_client import get_supabase_client
            # Use service account key — no JWT needed in worker
            db_client = get_supabase_client()

            await run_in_threadpool(
                lambda: db_client.table("swarm_runs").update({
                    "objective": transcribed_text,
                    "status": "queued"
                }).eq("id", swarm_run_id).execute()
            )

            await event_bus.publish(
                "swarm_queue",
                {
                    "swarm_run_id": swarm_run_id,
                    "user_id": user_id,
                    # token intentionally omitted — workers use service account
                },
            )
            logger.info(f"Updated swarm run {swarm_run_id} and queued for execution.")
        else:
            logger.warning(f"Missing swarm_run_id in STT message, skipping queue push.")

        # 4. Acknowledge message
        if msg_id:
            await redis_client.xack("stt_queue", "whisper_worker_group", msg_id)
            logger.info(f"Acknowledged STT message {msg_id}")

    except Exception as e:
        logger.error(f"STT transcription/queue error: {str(e)}")
    finally:
        # Cleanup temp files
        for path in [audio_path, converted_wav]:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass


async def main():
    logger.info("Initializing Speech-to-Text Whisper worker...")

    # Initialize Groq client
    keys = []
    index = 1
    while True:
        k = os.environ.get(f"GROQ_API_KEY_{index}")
        if not k:
            break
        keys.append(k.strip())
        index += 1
    if not keys:
        bare = os.environ.get("GROQ_API_KEY", "")
        if bare:
            keys.append(bare.strip())

    api_key = keys[0] if keys else ""

    # Force HTTP/1.1 to avoid HTTP/2 deadlocks
    http_client = httpx.AsyncClient(http1=True, http2=False)
    groq_client = AsyncGroq(api_key=api_key, http_client=http_client)
    logger.info("Groq API client initialized for Whisper STT.")

    redis_client = Redis.from_url(settings.REDIS_URL)
    event_bus = EventBus(redis_client)

    try:
        async for message in event_bus.consume(
            "stt_queue", "whisper_worker_group", "whisper_node_1"
        ):
            logger.info(f"Received audio transcription job for run: {message.get('swarm_run_id')}")
            # Non-blocking: fire and forget, loop continues immediately
            asyncio.create_task(
                _process_stt_job(message, groq_client, redis_client, event_bus)
            )
    finally:
        await redis_client.aclose()
        await http_client.aclose()
        logger.info("Whisper consumer shutdown complete.")


if __name__ == "__main__":
    asyncio.run(main())
