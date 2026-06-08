# Implemented by: workstream/6a-voice-ingestion
import os
import uuid
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from redis.asyncio import Redis
from groq import AsyncGroq
from backend.app.models.swarm_models import VoiceIngestResponse
from backend.app.core.dependencies import get_current_user
from backend.app.core.event_bus import EventBus
from backend.app.core.config import settings
from backend.app.core.supabase_client import get_supabase_client
from backend.app.memory.repository import SupabaseRepository

from fastapi.concurrency import run_in_threadpool
import httpx

router = APIRouter(prefix="/swarms/voice", tags=["voice"])

async def get_redis():
    client = Redis.from_url(settings.REDIS_URL)
    try:
        yield client
    finally:
        await client.aclose()


@router.post("", response_model=VoiceIngestResponse, status_code=200)
async def upload_voice_objective(
    req: Request,
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
):
    """
    Ingests raw audio binaries from client, saves to disk, creates an initial
    swarm run record, and delegates STT to the background worker.
    """
    # 1. MIME Validation
    content_type = audio.content_type
    allowed_types = ["audio/wav", "audio/x-wav", "audio/ogg", "audio/webm"]
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400, detail="MIME type must be WAV, OGG, or WEBM audio formats."
        )

    # Validate size
    audio_data = await audio.read()
    if len(audio_data) > 100 * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail="Audio file exceeds 100MB size limit."
        )

    # 2. Write temp asset
    ext = audio.filename.split(".")[-1] if audio.filename else "webm"
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}.{ext}")

    with open(temp_path, "wb") as f:
        f.write(audio_data)

    # 3. Create swarm run record in Supabase FIRST so UI can navigate
    auth_header = req.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() or "dev_token"
    
    db_client = get_supabase_client(token)

    run_data = {
        "user_id": user_id,
        "crew_id": "research-crew",  # Default for voice uploads
        "objective": "Transcribing audio...",
        "status": "queued",
        "priority_score": 1,
    }
    
    try:
        # Run DB insert in threadpool to prevent any possible sync blocking
        def insert_sync():
            response = db_client.table("swarm_runs").insert(run_data).execute()
            return response.data[0] if response.data else {}

        run_record = await run_in_threadpool(insert_sync)
        run_id = run_record.get("id")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(e)}")

    # 4. Delegate to whisper background worker via stt_queue
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "stt_queue",
        {
            "audio_path": temp_path,
            "user_id": user_id,
            "crew_id": "research-crew",
            "swarm_run_id": run_id,
            "token": token
        },
    )

    return VoiceIngestResponse(
        swarm_run_id=run_id,
        status="queued",
        message="Audio uploaded successfully. Transcription queued.",
    )
