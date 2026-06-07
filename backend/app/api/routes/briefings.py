# STUB — Implemented by: workstream/7-integration
from fastapi import APIRouter, Depends
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/workspace", tags=["briefings"])


@router.get("/{filename}")
async def get_workspace_file(filename: str, user_id: str = Depends(get_current_user)):
    raise NotImplementedError()
