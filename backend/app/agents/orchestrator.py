# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.core.llm_config import get_groq_llm



def create_orchestrator() -> Agent:
    return Agent(
        role="Orchestrator",
        goal="Analyze the user's objective and produce a clear, structured task plan as your Final Answer. Do NOT ask questions. Do NOT delegate. Simply output the plan.",
        backstory="You are a senior AI project manager. When given an objective, you immediately produce a structured breakdown of steps needed. You output your plan directly as your Final Answer without asking anyone anything.",
        allow_delegation=False,
        tools=[],
        max_iter=3,
        llm=get_groq_llm("llama-3.3-70b-versatile"),
        verbose=True,
    )

