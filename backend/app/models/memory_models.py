# STUB — Implemented by: workstream/0-architect
from pydantic import BaseModel


class MemorySearchResult(BaseModel):
    memory_event_id: str
    swarm_run_id: str
    agent_role: str
    content: str
    effective_score: float
    entities: list[str]
    created_at: str


class MemorySearchResponse(BaseModel):
    results: list[MemorySearchResult]
