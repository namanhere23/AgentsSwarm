# Implemented by: workstream/6a-voice-ingestion
import os
import uuid
import asyncio
import tempfile
import subprocess
from groq import AsyncGroq
import httpx
from redis.asyncio import Redis
from backend.app.core.config import settings
from backend.app.core.event_bus import EventBus
from backend.app.core.logging import get_logger

logger = get_logger("whisper_worker")

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
    if not keys:
        bare = os.environ.get("GROQ_API_KEY", "")
        if bare:
            keys.append(bare.strip())
    
    api_key = keys[0] if keys else ""
    groq_client = AsyncGroq(api_key=api_key)
    logger.info("Groq API client initialized for Whisper STT.")

    redis_client = Redis.from_url(settings.REDIS_URL)
    event_bus = EventBus(redis_client)

    async for message in event_bus.consume("stt_queue", "whisper_worker_group", "whisper_node_1"):
        logger.info(f"Received audio transcription job: {message}")
        
        audio_path = message.get("audio_path")
        user_id = message.get("user_id")
        crew_id = message.get("crew_id")
        
        if not audio_path or not os.path.exists(audio_path):
            logger.error("Audio target path missing or unreachable.")
            continue

        # 1. Downsample audio to 16kHz mono WAV using local ffmpeg
        temp_dir = tempfile.gettempdir()
        converted_wav = os.path.join(temp_dir, f"{uuid.uuid4()}.wav")
        try:
            subprocess.run([
                "ffmpeg", "-y",
                "-i", audio_path,
                "-ar", "16000",
                "-ac", "1",
                converted_wav
            ], check=True, capture_output=True)
        except Exception as e:
            logger.error(f"Ffmpeg conversion crashed: {str(e)}")
            continue

        # 2. Execute Groq Whisper transcription
        try:
            with open(converted_wav, "rb") as file:
                transcription = await groq_client.audio.transcriptions.create(
                    file=(converted_wav, file.read()),
                    model="whisper-large-v3",
                    response_format="json",
                )
            transcribed_text = transcription.text.strip()
            logger.info(f"Transcription complete: '{transcribed_text}'")

            # 3. Post objective to /swarms to trigger crew runs
            # Use authenticated client internally
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "http://localhost:8000/swarms",
                    json={"crew_id": crew_id, "objective": transcribed_text},
                    headers={"Authorization": f"Bearer {user_id}"} # Use user_id as token bypass in dev
                )
                logger.info(f"Swarm run queued from voice trigger: status={res.status_code}")

            # 4. Acknowledge message queue
            msg_id = message.get("_msg_id")
            if msg_id:
                await redis_client.xack("stt_queue", "whisper_worker_group", msg_id)

        except Exception as e:
            logger.error(f"Whisper transcription failed: {str(e)}")
        finally:
            # Cleanup temp assets
            for path in [audio_path, converted_wav]:
                if os.path.exists(path):
                    os.remove(path)

if __name__ == "__main__":
    asyncio.run(main())
