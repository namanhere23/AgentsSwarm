
from crewai import Agent
from backend.app.services.llm_adapter import LLMAdapter


def create_executor(tools: list) -> Agent:
    return Agent(
        role="Executor",
        goal="Translate planned steps into concrete external actions, routing each through the Approval Gate before dispatch.",
        backstory="You are a precise execution specialist. You construct exact API payloads and system commands. You never act without human approval on external mutations.",
        allow_delegation=False,
        tools=tools,
        llm=LLMAdapter(
            model="groq/llama-3.1-70b-versatile", temperature=0.0, max_tokens=1024
        ),
        verbose=True,
    )
