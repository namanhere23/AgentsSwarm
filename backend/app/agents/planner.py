# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.services.llm_adapter import LLMAdapter

def create_planner(tools: list) -> Agent:
    return Agent(
        role='Planner',
        goal='Enrich the TaskPlan with retrieved long-term memory context, producing a concrete, step-by-step StepSequence.',
        backstory='You are an expert research strategist. You combine retrieved knowledge with systematic thinking to produce detailed, actionable execution plans.',
        allow_delegation=False,
        tools=tools,
        llm=LLMAdapter(model='gemini-1.5-flash', temperature=0.2, max_tokens=2048),
        verbose=True
    )
