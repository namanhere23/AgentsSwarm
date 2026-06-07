# STUB — Implemented by: workstream/6a-voice-ingestion
from fastapi import APIRouter, Depends, UploadFile, File
from backend.app.models.swarm_models import VoiceIngestResponse
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/swarms/voice", tags=["voice"])


@router.post("", response_model=VoiceIngestResponse, status_code=202)
async def upload_voice_objective(
    audio: UploadFile = File(...), user_id: str = Depends(get_current_user)
):
    raise NotImplementedError()
