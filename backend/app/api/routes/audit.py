# STUB — Implemented by: workstream/4b-audit-executor
from fastapi import APIRouter, Depends
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])


@router.post("/{id}/rollback", status_code=202)
async def rollback_audit_action(id: str, user_id: str = Depends(get_current_user)):
    raise NotImplementedError()
