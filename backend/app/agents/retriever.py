# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.core.llm_config import get_groq_llm



def create_retriever(tools: list) -> Agent:
    return Agent(
        role="Retriever",
        goal="Fetch context from external APIs or local Vector DBs as requested by the Planner.",
        backstory="You are a data retrieval expert capable of efficiently querying vector databases and APIs to provide precise context.",
        allow_delegation=False,
        tools=tools,
        max_iter=5,
        llm=get_groq_llm(),
        verbose=True,
    )
