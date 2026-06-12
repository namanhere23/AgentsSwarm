# STUB — Implemented by: workstream/0-architect
from pydantic import BaseModel, Field
from typing import Literal


class CreateSwarmRequest(BaseModel):
    crew_id: str
    objective: str = Field(..., max_length=2000)
    priority_override: float | None = Field(None, ge=0.0, le=1.0)


class CreateSwarmResponse(BaseModel):
    swarm_run_id: str
    status: Literal["queued"]
    crew_id: str
    message: str


class SwarmRunResponse(BaseModel):
    swarm_run_id: str
    crew_id: str
    objective: str
    status: Literal["queued", "running", "completed", "failed"]
    created_at: str
    completed_at: str | None
    task_count: int
    tasks_completed: int
    output_summary: str | None


class VoiceIngestResponse(BaseModel):
    swarm_run_id: str | None = None
    status: Literal["transcribing", "queued"]
    message: str = "Audio queued for local transcription."
