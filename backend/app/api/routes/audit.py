# STUB-FILL — Implemented by: workstream/4b-audit-executor
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.core.dependencies import get_current_user
from backend.app.core.supabase_client import get_supabase_client

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
    # Handled by Phase 5B workstream (CREW-MANAGER-ROLLBACK)
    # Raising NotImplementedError stub for now
    raise HTTPException(
        status_code=501, detail="Rollback services implemented in Phase 5B"
    )
