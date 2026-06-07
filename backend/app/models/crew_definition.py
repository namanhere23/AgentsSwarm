# STUB — Implemented by: workstream/0-architect
from pydantic import BaseModel
from typing import Literal


class AgentDefinition(BaseModel):
    role: Literal["orchestrator", "planner", "retriever", "executor", "validator"]
    tools: list[str]


class CrewDefinition(BaseModel):
    id: str
    name: str
    description: str
    process: Literal["sequential", "hierarchical"]
    agents: list[AgentDefinition]
