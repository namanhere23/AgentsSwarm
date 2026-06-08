# STUB — Implemented by: workstream/0-architect
from pydantic import BaseModel, ConfigDict
from typing import Literal


class AgentDefinition(BaseModel):
    model_config = ConfigDict(extra='ignore')
    role: Literal["orchestrator", "planner", "retriever", "executor", "validator"]
    tools: list[str]


class CrewDefinition(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    name: str
    description: str
    process: Literal["sequential", "hierarchical"]
    agents: list[AgentDefinition]
