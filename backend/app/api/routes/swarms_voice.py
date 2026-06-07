# Implemented by: workstream/6a-voice-ingestion
import os
import uuid
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from redis.asyncio import Redis
from backend.app.models.swarm_models import VoiceIngestResponse
from backend.app.core.dependencies import get_current_user
from backend.app.core.event_bus import EventBus
from backend.app.core.config import settings

router = APIRouter(prefix="/swarms/voice", tags=["voice"])


async def get_redis():
    client = Redis.from_url(settings.REDIS_URL)
    try:
        yield client
    finally:
        await client.aclose()


@router.post("", response_model=VoiceIngestResponse, status_code=202)
async def upload_voice_objective(
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
):
    """
    Ingests raw audio binaries from client, validating MIME types.
    Saves temporary assets to disk and publishes jobs to STT queue.
    """
    # 1. MIME Validation
    content_type = audio.content_type
    allowed_types = ["audio/wav", "audio/x-wav", "audio/ogg", "audio/webm"]
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400, detail="MIME type must be WAV, OGG, or WEBM audio formats."
        )

    # Validate size (100MB ceiling)
    audio_data = await audio.read()
    if len(audio_data) > 100 * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail="Audio file exceeds 100MB size limit."
        )

    # 2. Write temp asset
    ext = audio.filename.split(".")[-1] if audio.filename else "wav"
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}.{ext}")

    with open(temp_path, "wb") as f:
        f.write(audio_data)

    # 3. Publish task to Redis stt_queue
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "stt_queue",
        {
            "audio_path": temp_path,
            "user_id": user_id,
            "crew_id": "research-crew",  # Route voice objectives to research crew by default
        },
    )

    return VoiceIngestResponse(
        swarm_run_id=None,
        status="transcribing",
        message="Audio uploaded successfully. Local transcription queued.",
    )
