# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent



def create_orchestrator() -> Agent:
    return Agent(
        role="Orchestrator",
        goal="Decompose the user's natural language objective into an ordered TaskPlan and delegate tasks to the appropriate specialist agents.",
        backstory="You are a senior AI project manager. You never execute tasks yourself. Your only job is to understand the goal, break it down, and assign work to your team.",
        allow_delegation=True,
        tools=[],
        llm="groq/llama3-8b-8192",
        verbose=True,
    )

