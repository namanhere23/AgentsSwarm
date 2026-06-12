# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.core.llm_config import get_groq_llm



def create_planner(tools: list) -> Agent:
    return Agent(
        role="Planner",
        goal="Enrich the TaskPlan with retrieved long-term memory context, producing a concrete, step-by-step StepSequence.",
        backstory="You are an expert research strategist. You combine retrieved knowledge with systematic thinking to produce detailed, actionable execution plans.",
        allow_delegation=False,
        tools=tools,
        max_iter=5,
        llm=get_groq_llm(),
        verbose=True,
    )

