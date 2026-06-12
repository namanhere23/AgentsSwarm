from crewai import Agent
from backend.app.core.llm_config import get_groq_llm


def create_executor(tools: list) -> Agent:
    return Agent(
        role="Executor",
        goal="Execute the planned steps systematically, using tools to generate required results.",
        backstory="You are an efficient doer. You take precise instructions and use the right tools to get the job done accurately and quickly.",
        allow_delegation=False,
        tools=tools,
        max_iter=5,
        llm=get_groq_llm(),
        verbose=True,
    )
