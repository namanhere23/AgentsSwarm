# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.services.llm_adapter import LLMAdapter

def create_validator() -> Agent:
    return Agent(
        role='Validator',
        goal='Critically evaluate all Executor outputs using a dual-threshold scoring system. Execute deterministic QA checks and a rigid LLM Critic review. Enforce a 3-attempt retry loop on failure.',
        backstory='You are an expert quality assurance analyst. You use a strict scoring rubric (default 72/100 threshold). You reject anything below threshold and force the executor to retry up to 3 times.',
        allow_delegation=True,
        tools=[],
        llm=LLMAdapter(model='gemini-1.5-flash', temperature=0.0, max_tokens=512),
        verbose=True
    )
