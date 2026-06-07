# STUB-FILL — Implemented by: workstream/2c-crew-registry-ingestion
import os
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
    crew_def = get_crew(request.crew_id)
    if not crew_def:
        raise HTTPException(status_code=404, detail="crew_id not registered")

    # 2. Check Concurrent limit of 10 runs per user
    concurrent_key = f"concurrent_runs:{user_id}"
    current_runs = await redis_client.get(concurrent_key)
    if current_runs and int(current_runs) >= 10:
        raise HTTPException(
            status_code=429,
            detail="Concurrent run limit reached",
            headers={"Retry-After": "60"},
        )

    # Extract the real Bearer token from the request to pass to Supabase RLS
    auth_header = req.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() or "dev_token"

    db_client = get_supabase_client(token)
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

    # 4. Increment concurrent tracker
    await redis_client.incr(concurrent_key)

    # 5. Enqueue to event bus stream
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "swarm_queue",
        {
            "swarm_run_id": run_id,
            "user_id": user_id,
            "token": token,
        },
    )

    return CreateSwarmResponse(
        swarm_run_id=run_id,
        status="queued",
        crew_id=request.crew_id,
        message="Swarm run successfully queued for execution.",
    )


@router.get("/{id}", response_model=SwarmRunResponse)
async def get_swarm_run(id: str, user_id: str = Depends(get_current_user)):
    db_client = get_supabase_client("auth_token")
    repo = SupabaseRepository()

    run = await repo.get_swarm_run(db_client, id)
    if not run:
        raise HTTPException(status_code=404, detail="Swarm run not found")

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
    id: str, format: str = "markdown", user_id: str = Depends(get_current_user)
):
    file_path = f"/app/workspace/{id}.md"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report not found")

    if format == "pdf":
        import subprocess

        pdf_path = f"/app/workspace/{id}.pdf"
        try:
            subprocess.run(
                [
                    "pandoc",
                    "--from",
                    "markdown",
                    "--to",
                    "pdf",
                    file_path,
                    "-o",
                    pdf_path,
                ],
                check=True,
            )
            return FileResponse(
                pdf_path, media_type="application/pdf", filename=f"report_{id}.pdf"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"PDF generation failed: {str(e)}"
            )

    return FileResponse(
        file_path, media_type="text/markdown", filename=f"report_{id}.md"
    )


@router.get("/{id}/resume", status_code=202)
async def resume_swarm_run(
    id: str,
    user_id: str = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
):
    db_client = get_supabase_client("auth")
    repo = SupabaseRepository()
    run = await repo.get_swarm_run(db_client, id)

    if not run:
        raise HTTPException(status_code=404, detail="Swarm run not found")
    if run["status"] != "failed":
        raise HTTPException(status_code=400, detail="Only failed runs can be resumed")

    # Enqueue resume signal
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
