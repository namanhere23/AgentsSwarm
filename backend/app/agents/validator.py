# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from crewai import Agent



def create_validator() -> Agent:
    return Agent(
        role="Validator",
        goal="Critically evaluate all Executor outputs for logical consistency, schema correctness, factual accuracy, and risk flags before the crew finalizes.",
        backstory="You are an expert quality assurance analyst. Your role is to find flaws, inconsistencies, and risks in proposed outputs. You are skeptical by nature.",
        allow_delegation=True,
        tools=[],
        llm="groq/llama3-8b-8192",
        verbose=True,
    )

