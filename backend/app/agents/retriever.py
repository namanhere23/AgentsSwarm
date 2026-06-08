# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent



def create_retriever(tools: list) -> Agent:
    return Agent(
        role="Retriever",
        goal="Fetch the most relevant real-time and archival information to support the current task objective.",
        backstory="You are a world-class research analyst with access to the web and a long-term knowledge base. You surface only the most relevant, accurate information.",
        allow_delegation=False,
        tools=tools,
        llm="groq/llama3-8b-8192",
        verbose=True,
    )

