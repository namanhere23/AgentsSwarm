# STUB-FILL — Implemented by: workstream/2c-crew-registry-ingestion
import os
import re
import pathlib
import subprocess
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from redis.asyncio import Redis
from backend.app.models.swarm_models import (
    CreateSwarmRequest,
    CreateSwarmResponse,
    SwarmRunResponse,
)
from backend.app.core.dependencies import get_current_user
from backend.app.core.supabase_client import get_supabase_client
from backend.app.core.crew_registry import get_crew
from backend.app.core.event_bus import EventBus
from backend.app.memory.repository import SupabaseRepository
from backend.app.core.config import settings

router = APIRouter(prefix="/swarms", tags=["swarms"])

# UUID v4 pattern — used to validate run IDs before any file/DB ops
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)

# Resolved workspace root (used for path-traversal guard)
_WORKSPACE = pathlib.Path(settings.WORKSPACE_DIR).resolve()


def _validate_run_id(run_id: str) -> None:
    """Raise 400 if run_id is not a valid UUID (blocks path traversal & injection)."""
    if not _UUID_RE.match(run_id):
        raise HTTPException(status_code=400, detail="Invalid run ID format.")


def _safe_workspace_path(run_id: str, ext: str) -> pathlib.Path:
    """Return a resolved path guaranteed to be inside the workspace directory."""
    _validate_run_id(run_id)
    resolved = (_WORKSPACE / f"{run_id}{ext}").resolve()
    if not str(resolved).startswith(str(_WORKSPACE)):
        # Should never happen after UUID validation, but defence-in-depth
        raise HTTPException(status_code=400, detail="Invalid path.")
    return resolved


# Event Bus and Rate limit redis connections helper
async def get_redis():
    client = Redis.from_url(settings.REDIS_URL)
    try:
        yield client
    finally:
        await client.aclose()


@router.post("", response_model=CreateSwarmResponse, status_code=202)
async def create_swarm(
    request: CreateSwarmRequest,
    req: Request,
    user_id: str = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
):
    # 1. Verify Crew ID
    if request.crew_id == "string" or not request.crew_id:
        request.crew_id = "research-crew"

    crew_def = get_crew(request.crew_id)
    if not crew_def:
        raise HTTPException(status_code=404, detail="crew_id not registered")

    # 2. Check Concurrent limit — atomic INCR-first to prevent race condition
    # Two simultaneous requests could both read count=9 and both pass a GET-then-check.
    # Instead: increment first, then check. Roll back if over limit.
    concurrent_key = f"concurrent_runs:{user_id}"
    new_count = await redis_client.incr(concurrent_key)
    if new_count > 10:
        await redis_client.decr(concurrent_key)  # rollback
        raise HTTPException(
            status_code=429,
            detail="Concurrent run limit reached",
            headers={"Retry-After": "60"},
        )

    db_client = get_supabase_client()  # Service key — no JWT needed
    repo = SupabaseRepository()

    # 3. Create run record
    run_data = {
        "user_id": user_id,
        "crew_id": request.crew_id,
        "objective": request.objective,
        "status": "queued",
        "priority_score": request.priority_override,
    }
    run_record = await repo.insert_swarm_run(db_client, run_data)
    run_id = run_record.get("id")

    # 4. Enqueue to event bus stream — NO JWT token in queue (VULN-3 fix)
    # Workers use the service key via get_supabase_client(), user_id is enough.
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "swarm_queue",
        {
            "swarm_run_id": run_id,
            "user_id": user_id,
            # token intentionally omitted — workers use service account
        },
    )

    return CreateSwarmResponse(
        swarm_run_id=run_id,
        status="queued",
        crew_id=request.crew_id,
        message="Swarm run successfully queued for execution.",
    )


@router.get("/{id}", response_model=SwarmRunResponse)
async def get_swarm_run(id: UUID, user_id: str = Depends(get_current_user)):
    run_id = str(id)
    _validate_run_id(run_id)  # blocks non-UUID ids early
    db_client = get_supabase_client()
    repo = SupabaseRepository()

    run = await repo.get_swarm_run(db_client, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Swarm run not found")

    # VULN-1 fix: ownership check — users can only read their own runs
    if run.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return SwarmRunResponse(
        swarm_run_id=run["id"],
        crew_id=run["crew_id"],
        objective=run["objective"],
        status=run["status"],
        created_at=run["created_at"],
        completed_at=run.get("completed_at"),
        task_count=0,  # Detail counters managed by worker callbacks
        tasks_completed=0,
        output_summary=run.get("output_summary"),
    )


@router.get("/{id}/report")
async def get_swarm_report(
    id: UUID, format: str = "markdown", user_id: str = Depends(get_current_user)
):
    run_id = str(id)
    # VULN-2 fix: UUID validation + path traversal guard
    file_path = _safe_workspace_path(run_id, ".md")

    # VULN-1 fix: ownership check before serving the file
    db_client = get_supabase_client()
    repo = SupabaseRepository()
    run = await repo.get_swarm_run(db_client, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Report not found")
    if run.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")

    if format == "pdf":
        pdf_path = _safe_workspace_path(run_id, ".pdf")
        try:
            subprocess.run(
                ["pandoc", "--from", "markdown", "--to", "pdf", str(file_path), "-o", str(pdf_path)],
                check=True,
                capture_output=True,
                timeout=30,
            )
            return FileResponse(
                str(pdf_path), media_type="application/pdf", filename=f"report_{run_id}.pdf"
            )
        except Exception:
            # Don't leak internal error details to client
            raise HTTPException(status_code=500, detail="PDF generation failed.")

    return FileResponse(
        str(file_path), media_type="text/markdown", filename=f"report_{run_id}.md"
    )

@router.get("/{id}/resume", status_code=202)
async def resume_swarm_run(
    id: UUID,
    user_id: str = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
):
    run_id = str(id)
    _validate_run_id(run_id)
    db_client = get_supabase_client()
    repo = SupabaseRepository()
    run = await repo.get_swarm_run(db_client, run_id)

    if not run:
        raise HTTPException(status_code=404, detail="Swarm run not found")

    # VULN-1 fix: ownership check — users can only resume their own runs
    if run.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if run["status"] != "failed":
        raise HTTPException(status_code=400, detail="Only failed runs can be resumed")

    # Enqueue resume signal — NO JWT token (VULN-3 fix)
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "swarm_queue",
        {
            "swarm_run_id": id,
            "resume": True,
            "user_id": user_id,
        },
    )

    return {"message": "Swarm run resume successfully signaled."}
