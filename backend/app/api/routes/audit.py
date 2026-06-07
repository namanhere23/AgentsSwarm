from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.core.dependencies import get_current_user
from backend.app.core.supabase_client import get_supabase_client
from backend.app.services.approval_gate import approval_gate

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tool_name: str = None,
    user_id: str = Depends(get_current_user),
):
    """Exposes paginated table views of executed mutations."""
    db = get_supabase_client("auth")

    offset = (page - 1) * limit
    query = db.table("audit_log").select("*")

    if tool_name:
        query = query.eq("tool_name", tool_name)

    response = (
        query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    )
    return {"data": response.data, "page": page, "limit": limit}


@router.post("/{id}/rollback", status_code=202)
async def rollback_audit_action(id: str, user_id: str = Depends(get_current_user)):
    """Submits compiled inverse action payloads to Approval Gates."""
    db = get_supabase_client("auth")

    # 1. Fetch rollback action
    response = db.table("rollback_actions").select("*").eq("audit_log_id", id).execute()
    if not response.data:
        raise HTTPException(
            status_code=404, detail="Rollback mapping not registered for this action."
        )

    rollback_record = response.data[0]
    inverse_payload = rollback_record["inverse_payload"]

    # Fetch audit tool info
    audit_res = db.table("audit_log").select("tool_name").eq("id", id).execute()
    tool_name = audit_res.data[0]["tool_name"] if audit_res.data else "HttpActionTool"

    # 2. Submit to approval gate
    # Set dummy placeholder run id for rollbacks
    dummy_run_id = "00000000-0000-0000-0000-000000000000"
    app_id = await approval_gate.create_approval_request(
        tool_name=tool_name,
        proposed_payload=inverse_payload,
        risk_level="high",
        swarm_run_id=dummy_run_id,
        user_id=user_id,
        db_client=db,
    )

    return {
        "approval_request_id": app_id,
        "message": "Rollback transaction successfully submitted to gates.",
    }
