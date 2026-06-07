# STUB — Implemented by: workstream/5a-memory-explorer
from fastapi import APIRouter, Depends
from backend.app.models.memory_models import MemorySearchResponse
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/search", response_model=MemorySearchResponse)
async def search_memory(q: str, user_id: str = Depends(get_current_user)):
    raise NotImplementedError()


@router.post("/events", response_model=str)
async def create_memory_event(event: dict, user_id: str = Depends(get_current_user)):
    raise NotImplementedError()
