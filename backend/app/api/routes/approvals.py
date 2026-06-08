# STUB-FILL — Implemented by: workstream/4a-approval-gate
from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from backend.app.models.approval_models import (
    ApprovalRequest,
    ApproveResponse,
    RejectResponse,
)
from backend.app.core.dependencies import get_current_user, get_db_client
from backend.app.core.event_bus import EventBus
from backend.app.services.approval_gate import approval_gate
from backend.app.core.config import settings

router = APIRouter(prefix="/approvals", tags=["approvals"])


async def get_redis():
    client = Redis.from_url(settings.REDIS_URL)
    try:
        yield client
    finally:
        await client.aclose()


@router.get("", response_model=list[ApprovalRequest])
async def list_approvals(
    status: str = "pending",
    user_id: str = Depends(get_current_user),
    db=Depends(get_db_client),
):
    response = (
        db.table("approval_requests")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", status)
        .execute()
    )
    return response.data


@router.post("/{id}/approve", response_model=ApproveResponse)
async def approve_action(
    id: str,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db_client),
    redis_client: Redis = Depends(get_redis),
):

    # 1. Verify existence
    response = (
        db.table("approval_requests")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Approval request not found")

    record = response.data[0]
    if record["status"] != "pending":
        raise HTTPException(
            status_code=400, detail="Approval request is not in pending state"
        )

    # 2. Release approval gate lock
    await approval_gate.approve(id, db)

    # 3. Publish approval signal event
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "ws_events",
        {
            "type": "APPROVAL_GRANTED",
            "swarm_run_id": record["swarm_run_id"],
            "data": {"approval_request_id": id},
        },
    )

    return ApproveResponse(
        id=id,
        status="approved",
        message="Action approved and released to executor thread.",
    )


@router.post("/{id}/reject", response_model=RejectResponse)
async def reject_action(
    id: str,
    reason: dict,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db_client),
    redis_client: Redis = Depends(get_redis),
):

    response = (
        db.table("approval_requests")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Approval request not found")

    record = response.data[0]
    if record["status"] != "pending":
        raise HTTPException(
            status_code=400, detail="Approval request is not in pending state"
        )

    rej_reason = reason.get("reason", "No reason provided")

    # 2. Release lock with rejection payload
    await approval_gate.reject(id, rej_reason, db)

    # 3. Publish event
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "ws_events",
        {
            "type": "APPROVAL_REJECTED",
            "swarm_run_id": record["swarm_run_id"],
            "data": {"approval_request_id": id, "reason": rej_reason},
        },
    )

    return RejectResponse(
        id=id, status="rejected", message="Action rejected and returned to planner."
    )
