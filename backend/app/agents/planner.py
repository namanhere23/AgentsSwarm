# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent



def create_planner(tools: list) -> Agent:
    return Agent(
        role="Planner",
        goal="Enrich the TaskPlan with retrieved long-term memory context, producing a concrete, step-by-step StepSequence.",
        backstory="You are an expert research strategist. You combine retrieved knowledge with systematic thinking to produce detailed, actionable execution plans.",
        allow_delegation=False,
        tools=tools,
        llm="groq/llama3-8b-8192",
        verbose=True,
    )

