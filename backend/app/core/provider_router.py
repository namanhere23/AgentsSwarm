# NEW — Implemented by: workstream/2b-llm-adapter-tools
"""
SmartRouter — Agent-Role-to-Provider Affinity Mapping
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Maps each agent role to its optimal provider and model,
routing to the cheapest provider sufficient for the task:
  - guardian / validator  → gemini-1.5-flash  (fast, cheap, sufficient)
  - planner / retriever   → groq/llama-3.1-70b (strong reasoning)
  - executor / orchestrator → gemini-1.5-pro or fallback
  - replanner             → groq/llama-3.1-70b (critical path)
"""

# Agent-role → (preferred_provider, model) affinity table
ROLE_AFFINITY: dict[str, tuple[str, str]] = {
    "guardian":     ("gemini", "gemini-1.5-flash"),
    "validator":    ("gemini", "gemini-1.5-flash"),
    "orchestrator": ("gemini", "gemini-1.5-pro"),
    "planner":      ("groq",   "llama-3.1-70b-versatile"),
    "retriever":    ("groq",   "llama-3.1-70b-versatile"),
    "executor":     ("groq",   "llama-3.1-70b-versatile"),
    "replanner":    ("groq",   "llama-3.1-70b-versatile"),
    "qa_verifier":  ("gemini", "gemini-1.5-flash"),
    # default for any unregistered role
    "_default":     ("gemini", "gemini-1.5-flash"),
}

def get_preferred_provider(agent_role: str) -> tuple[str, str]:
    """Return (provider_name, model_name) for the given agent role."""
    return ROLE_AFFINITY.get(agent_role.lower(), ROLE_AFFINITY["_default"])
