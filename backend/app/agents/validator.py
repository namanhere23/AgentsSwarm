# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.core.llm_config import get_groq_llm



def create_validator() -> Agent:
    return Agent(
        role="Validator",
        goal="Review execution results against the original objective and safety policies.",
        backstory="You are an extremely strict auditor. You evaluate whether an action succeeded or failed, and ensure it respects all system rules.",
        allow_delegation=False,
        tools=[],
        max_iter=5,
        llm=get_groq_llm(),
        verbose=True,
    )
