# STUB — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.services.llm_adapter import LLMAdapter

def create_replanner() -> Agent:
    """
    Replanner agent. Activates when the Critic/Validator rejects an output.
    Receives rejection feedback and rewrites the step plan without triggering
    a full Orchestrator restart. Uses Groq for strong reasoning on critical path.
    """
    return Agent(
        role='Replanner',
        goal='Receive rejection feedback from the Validator and produce a revised, targeted execution plan.',
        backstory='You are an expert problem analyst. When a plan fails, you diagnose why and write a precise corrective plan.',
        allow_delegation=False,
        tools=[],
        llm=LLMAdapter(model='llama-3.1-70b-versatile', agent_role='replanner'),
        verbose=True
    )
