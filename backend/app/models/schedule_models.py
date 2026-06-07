# STUB — Implemented by: workstream/0-architect
from pydantic import BaseModel, Field


class CreateScheduleRequest(BaseModel):
    crew_id: str
    objective: str = Field(..., max_length=2000)
    cron_expression: str
    timezone: str = "UTC"
