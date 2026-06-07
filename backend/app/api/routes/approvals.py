# STUB — Implemented by: workstream/4a-approval-gate
from fastapi import APIRouter, Depends
from backend.app.models.approval_models import (
    ApprovalRequest,
    ApproveResponse,
    RejectResponse,
)
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalRequest])
async def list_approvals(
    status: str = "pending", user_id: str = Depends(get_current_user)
):
    raise NotImplementedError()


@router.post("/{id}/approve", response_model=ApproveResponse)
async def approve_action(id: str, user_id: str = Depends(get_current_user)):
    raise NotImplementedError()


@router.post("/{id}/reject", response_model=RejectResponse)
async def reject_action(
    id: str, reason: dict, user_id: str = Depends(get_current_user)
):
    raise NotImplementedError()
