"""
BehavioralGuardrail — Anomaly detection for agent logic loops and scope creep.

Audits the generated plan against execution history to detect:
- Circular task loops (agent keeps re-adding the same task)
- Scope creep (plan grows unboundedly with each iteration)
- Stalled progress (no new tasks completed after N iterations)
"""
from backend.app.core.logging import get_logger

logger = get_logger("behavioral_guardrail")

# Thresholds
MAX_LOOP_REPETITIONS = 3     # Same task description seen N times → loop
MAX_PLAN_SIZE = 50           # Plan with >50 tasks is scope creep
MAX_STALL_ITERATIONS = 5     # No progress for 5 consecutive checks → stall


class BehavioralGuardrail:
    """Anomaly detection for agent logic loops and scope creep."""

    async def audit_plan(self, plan: dict, history: list) -> dict:
        """
        Audit a generated plan against the execution history.

        Args:
            plan: The current agent plan dict (expects 'tasks' key as list of str)
            history: List of past plan dicts from previous iterations

        Returns:
            dict with keys: safe (bool), anomaly_type (str|None), details (str)
        """
        tasks = plan.get("tasks", [])
        anomalies: list[str] = []

        # 1. Scope creep detection
        if len(tasks) > MAX_PLAN_SIZE:
            anomalies.append(
                f"SCOPE_CREEP: Plan contains {len(tasks)} tasks, exceeding max of {MAX_PLAN_SIZE}"
            )

        # 2. Loop detection — check if same task descriptions repeat across history
        all_past_tasks: list[str] = []
        for past_plan in history:
            all_past_tasks.extend(past_plan.get("tasks", []))

        for task in tasks:
            count = all_past_tasks.count(task)
            if count >= MAX_LOOP_REPETITIONS:
                anomalies.append(
                    f"LOOP_DETECTED: Task '{task[:80]}' has appeared {count} times in history"
                )

        # 3. Stall detection — check if tasks_completed hasn't changed in recent history
        if len(history) >= MAX_STALL_ITERATIONS:
            recent = history[-MAX_STALL_ITERATIONS:]
            completed_counts = [h.get("tasks_completed", 0) for h in recent]
            if len(set(completed_counts)) == 1:
                anomalies.append(
                    f"STALL_DETECTED: No progress for {MAX_STALL_ITERATIONS} consecutive iterations "
                    f"(tasks_completed={completed_counts[0]})"
                )

        if anomalies:
            logger.warning(f"BehavioralGuardrail triggered: {anomalies}")
            return {
                "safe": False,
                "anomaly_type": anomalies[0].split(":")[0],
                "details": "; ".join(anomalies),
            }

        return {"safe": True, "anomaly_type": None, "details": "No anomalies detected"}
