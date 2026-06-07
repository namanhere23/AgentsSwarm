# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent
from backend.app.services.llm_adapter import LLMAdapter

def create_retriever(tools: list) -> Agent:
    return Agent(
        role="Retriever",
        goal="Fetch the most relevant real-time and archival information to support the current task objective.",
        backstory="You are a world-class research analyst with access to the web and a long-term knowledge base. You surface only the most relevant, accurate information.",
        allow_delegation=False,
        tools=tools,
        llm=LLMAdapter(
            model="groq/llama-3.1-70b-versatile", temperature=0.0, max_tokens=1024
        ),
        verbose=True,
    )
