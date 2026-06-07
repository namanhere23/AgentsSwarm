# STUB — Implemented by: workstream/6b-scheduler-decay
from fastapi import APIRouter, Depends
from backend.app.models.schedule_models import CreateScheduleRequest
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/swarms/schedule", tags=["schedules"])


@router.post("", status_code=201)
async def create_schedule(
    request: CreateScheduleRequest, user_id: str = Depends(get_current_user)
):
    raise NotImplementedError()
