# STUB — Implemented by: workstream/0-architect
from pydantic import BaseModel
from typing import Literal


class ApprovalRequest(BaseModel):
    id: str
    user_id: str
    swarm_run_id: str
    tool_name: str
    proposed_payload: dict
    risk_level: Literal["low", "medium", "high"]
    status: Literal["pending", "approved", "rejected", "executed", "failed"]
    rejection_reason: str | None
    created_at: str


class ApproveResponse(BaseModel):
    id: str
    status: Literal["approved"]
    message: str = "Action dispatched to executor."


class RejectResponse(BaseModel):
    id: str
    status: Literal["rejected"]
    message: str = "Rejection reason returned to agent for replanning."


class ApprovalResult(BaseModel):
    status: Literal["approved", "rejected"]
    rejection_reason: str | None = None
