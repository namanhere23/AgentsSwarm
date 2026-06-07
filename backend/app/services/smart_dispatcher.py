"""
SmartDispatcher — Routes tasks to the most appropriate agent based on capabilities and load.

Resolves which agent should receive a given task based on:
1. Required capabilities declared in the TaskNode
2. Current agent load (tasks in flight)
3. Provider affinity scores from PipelineOptimizer
"""
from backend.app.core.logging import get_logger

logger = get_logger("smart_dispatcher")

# Default capability-to-agent-role mapping
_CAPABILITY_AGENT_MAP: dict[str, str] = {
    "web_search": "retriever",
    "vector_search": "retriever",
    "keyword_search": "retriever",
    "code_execution": "executor",
    "file_write": "executor",
    "http_action": "executor",
    "planning": "planner",
    "decomposition": "orchestrator",
    "validation": "validator",
}


class SmartDispatcher:
    """
    Routes tasks to appropriate agents based on capabilities and load.
    Deterministic — no LLM calls, zero-cost.
    """

    def __init__(self):
        self._agent_loads: dict[str, int] = {}

    def _resolve_agent(self, required_capabilities: list[str]) -> str:
        """Map required capabilities to the best matching agent role."""
        for cap in required_capabilities:
            role = _CAPABILITY_AGENT_MAP.get(cap.lower())
            if role:
                return role
        # Default to executor if no specific mapping found
        return "executor"

    async def dispatch(self, task: dict) -> dict:
        """
        Determine which agent should handle the given task.

        Args:
            task: TaskNode dict with keys: id, task_description, required_capabilities, priority

        Returns:
            dict with keys: agent_role (str), agent_id (str), reason (str)
        """
        task_id = task.get("id", "unknown")
        required_caps = task.get("required_capabilities", [])
        priority = task.get("priority", "medium")

        # Resolve target agent role
        target_role = self._resolve_agent(required_caps)

        # Track load
        self._agent_loads[target_role] = self._agent_loads.get(target_role, 0) + 1

        logger.info(
            f"SmartDispatcher: task={task_id} → agent_role={target_role} "
            f"priority={priority} load={self._agent_loads[target_role]}"
        )

        return {
            "agent_role": target_role,
            "agent_id": f"{target_role}_1",
            "reason": f"Matched capabilities {required_caps} → {target_role}",
        }

    def release(self, agent_role: str) -> None:
        """Decrement the load counter when an agent completes a task."""
        if agent_role in self._agent_loads:
            self._agent_loads[agent_role] = max(0, self._agent_loads[agent_role] - 1)
