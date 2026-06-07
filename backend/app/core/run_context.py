# STUB — Implemented by: workstream/3a-crew-execution-engine
from dataclasses import dataclass, field
from pathlib import Path
from pydantic import BaseModel
from typing import Literal

class TaskNode(BaseModel):
    id: str
    task_description: str
    priority: Literal["low", "medium", "high", "critical"]
    estimated_complexity: Literal["simple", "medium", "complex"]
    required_capabilities: list[str] = []

class TaskEdge(BaseModel):
    source_id: str
    target_id: str
    condition: Literal["on_success", "on_failure", "always"] = "on_success"
    data_passing: bool = True

class TaskGraph(BaseModel):
    nodes: list[TaskNode]
    edges: list[TaskEdge]

@dataclass
class RunContext:
    """
    Per-run scoped state shared across all agents.
    Provides canonical output directory:
        output/session_<run_id>/
        ├── attempts/task_<id>/attempt_<n>/
        ├── final/
        └── manifest.json
    """
    run_id: str
    run_output_dir: Path
    attempt_index_by_task: dict = field(default_factory=dict)
    provider_failures: list[dict] = field(default_factory=list)

    def get_attempt_dir(self, task_id: int) -> Path: raise NotImplementedError()
    def record_provider_failure(self, provider: str, error: str, agent: str = "") -> None: raise NotImplementedError()
