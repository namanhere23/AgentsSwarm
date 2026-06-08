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
    
    # Fix HTTP/2 deadlocks by forcing HTTP/1.1
    import httpx
    http_client = httpx.AsyncClient(http1=True, http2=False)
    groq_client = AsyncGroq(api_key=api_key, http_client=http_client)
    
    logger.info("Groq API client initialized for Whisper STT.")

    redis_client = Redis.from_url(settings.REDIS_URL)
    event_bus = EventBus(redis_client)

    async for message in event_bus.consume(
        "stt_queue", "whisper_worker_group", "whisper_node_1"
    ):
        logger.info(f"Received audio transcription job: {message}")

        audio_path = message.get("audio_path")
        user_id = message.get("user_id")
        crew_id = message.get("crew_id")

        if not audio_path or not os.path.exists(audio_path):
            with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Missing audio path: {audio_path}\n")
            continue

        with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Audio found: {audio_path}. Converting...\n")

        # 1. Downsample audio to 16kHz mono WAV using local ffmpeg
        temp_dir = tempfile.gettempdir()
        converted_wav = os.path.join(temp_dir, f"{uuid.uuid4()}.wav")
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    audio_path,
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    converted_wav,
                ],
                check=True,
                capture_output=True,
            )
            with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Ffmpeg conversion successful.\n")
        except Exception as e:
            with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Ffmpeg error: {str(e)}\n")
            continue

        # 2. Execute Groq Whisper transcription
        try:
            with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Calling Groq STT...\n")
            with open(converted_wav, "rb") as file:
                transcription = await groq_client.audio.transcriptions.create(
                    file=(converted_wav, file.read()),
                    model="whisper-large-v3",
                    response_format="json",
                )
            transcribed_text = transcription.text.strip()
            with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Transcription: {transcribed_text}\n")

            # 3. Update existing swarm run and push to swarm_queue
            swarm_run_id = message.get("swarm_run_id")
            token = message.get("token")
            
            if swarm_run_id and token:
                from backend.app.core.supabase_client import get_supabase_client
                db_client = get_supabase_client(token)
                
                # Update objective and set status to queued
                db_client.table("swarm_runs").update({
                    "objective": transcribed_text,
                    "status": "queued"
                }).eq("id", swarm_run_id).execute()
                
                # Push to crew execution queue
                await event_bus.publish(
                    "swarm_queue",
                    {
                        "swarm_run_id": swarm_run_id,
                        "user_id": user_id,
                        "token": token,
                    },
                )
                with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Updated swarm run {swarm_run_id} and queued.\n")
            else:
                with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write("Missing swarm_run_id or token in message.\n")

            # 4. Acknowledge message queue
            msg_id = message.get("_msg_id")
            if msg_id:
                await redis_client.xack("stt_queue", "whisper_worker_group", msg_id)
                with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Acked message {msg_id}\n")

        except Exception as e:
            with open("C:/Users/Hema/Downloads/AgentsSwarm/worker_debug.txt", "a") as df: df.write(f"Transcription/POST error: {str(e)}\n")
        finally:
            # Cleanup temp assets
            for path in [audio_path, converted_wav]:
                if os.path.exists(path):
                    os.remove(path)


if __name__ == "__main__":
    asyncio.run(main())
