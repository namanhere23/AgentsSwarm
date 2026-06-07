"""
RunContext — Per-run scoped state shared across all agents.

Provides canonical output directory structure:
    output/session_<run_id>/
    ├── attempts/task_<id>/attempt_<n>/
    ├── final/
    └── manifest.json
"""
from dataclasses import dataclass, field
from pathlib import Path
from pydantic import BaseModel
from typing import Literal
import json


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
    Provides canonical output directory structure.
    """

    run_id: str
    run_output_dir: Path
    attempt_index_by_task: dict = field(default_factory=dict)
    provider_failures: list[dict] = field(default_factory=list)

    def __post_init__(self):
        """Ensure output directories exist on creation."""
        self.run_output_dir.mkdir(parents=True, exist_ok=True)
        (self.run_output_dir / "attempts").mkdir(exist_ok=True)
        (self.run_output_dir / "final").mkdir(exist_ok=True)

    def get_attempt_dir(self, task_id: str) -> Path:
        """Return (and create) the attempt directory for the given task."""
        attempt_n = self.attempt_index_by_task.get(task_id, 0) + 1
        self.attempt_index_by_task[task_id] = attempt_n
        attempt_dir = self.run_output_dir / "attempts" / f"task_{task_id}" / f"attempt_{attempt_n}"
        attempt_dir.mkdir(parents=True, exist_ok=True)
        return attempt_dir

    def record_provider_failure(self, provider: str, error: str, agent: str = "") -> None:
        """Append a provider failure record and write the manifest."""
        record = {"provider": provider, "error": error, "agent": agent}
        self.provider_failures.append(record)
        manifest_path = self.run_output_dir / "manifest.json"
        manifest = {
            "run_id": self.run_id,
            "attempt_index": self.attempt_index_by_task,
            "provider_failures": self.provider_failures,
        }
        manifest_path.write_text(json.dumps(manifest, indent=2))
