# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from backend.app.memory.repository import SupabaseRepository


def delegation_callback(
    from_agent: str, to_agent: str, task_description: str, swarm_run_id: str, db_client
) -> None:
    """Callback triggered on inter-agent delegation. Writes log entry to Postgres."""
    repo = SupabaseRepository()

    # Run in simple background executor or thread if blocker
    import asyncio

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            repo.insert_memory_event(
                db_client,
                {
                    "swarm_run_id": swarm_run_id,
                    "agent_role": from_agent,
                    "task_description": f"Delegation to {to_agent}",
                    "content": task_description,
                    "priority_score": 0.5,
                    "effective_score": 0.5,
                },
            )
        )
    except RuntimeError:
        pass

