from fastapi import APIRouter, Depends, HTTPException
from croniter import croniter
from backend.app.models.schedule_models import CreateScheduleRequest
from backend.app.core.dependencies import get_current_user, get_db_client
from backend.app.core.crew_registry import get_crew

router = APIRouter(prefix="/swarms/schedule", tags=["schedules"])


@router.post("", status_code=201)
async def create_schedule(
    request: CreateScheduleRequest,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db_client),
):
    """Registers new scheduled triggers, validating cron parameters."""
    # 1. Validate Crew Existence
    crew = get_crew(request.crew_id)
    if not crew:
        raise HTTPException(status_code=404, detail="crew_id not registered")

    # 2. Validate Cron Syntax
    if not croniter.is_valid(request.cron_expression):
        raise HTTPException(status_code=400, detail="Invalid cron expression format.")

    # 3. Write Schedule settings to Postgres
    response = (
        db.table("scheduled_swarms")
        .insert(
            {
                "user_id": user_id,
                "crew_id": request.crew_id,
                "objective": request.objective,
                "cron_expression": request.cron_expression,
                "timezone": request.timezone,
                "is_active": True,
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=500, detail="Failed to write schedule configuration record."
        )

    return response.data[0]
