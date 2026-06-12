import litellm
import os
# Drop unsupported params like cache_breakpoint (Groq doesn't support it)
# Must be set before any CrewAI imports to take effect
litellm.drop_params = True
# Additional litellm configuration to prevent cache-related parameters
os.environ["LITELLM_CACHE"] = "false"
os.environ["LITELLM_DROP_PARAMS"] = "true"
litellm.set_verbose = False
from crewai import Crew, Process, Task
from backend.app.core.logging import get_logger
from backend.app.core.supabase_client import get_supabase_client
from backend.app.core.tool_registry import get_tool
from backend.app.core.checkpointer import PostgresCheckpointer
from backend.app.core.event_bus import EventBus
from backend.app.memory.repository import SupabaseRepository
from backend.app.services.report_generator import generate_report
from backend.app.services.briefing_service import BriefingService
from backend.app.agents.orchestrator import create_orchestrator
from backend.app.agents.planner import create_planner
from backend.app.agents.retriever import create_retriever
from backend.app.agents.executor import create_executor
from backend.app.agents.validator import create_validator
from backend.app.agents.delegation_logger import delegation_callback
from redis.asyncio import Redis
from backend.app.core.config import settings

logger = get_logger("crew_executor")

# Initialize checkpointer pool
_checkpointer = None


def get_checkpointer():
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = PostgresCheckpointer()
        # In testing mode with MOCK_TOOLS, don't attempt real DB connection
        if not settings.MOCK_TOOLS:
            _checkpointer.setup()
    return _checkpointer


async def execute_crew(
    swarm_run_id: str, crew_def, objective: str, user_id: str
) -> None:
    """Instantiates the Crew topology and executes kickoff within the psycopg Saver thread context."""
    # Always use service account key — no JWT passed through queue
    db_client = get_supabase_client()
    repo = SupabaseRepository()

    # 1. Update status
    await repo.update_swarm_run_status(db_client, swarm_run_id, "running")

    # 2. Emit WS start event
    redis_client = Redis.from_url(settings.REDIS_URL)
    event_bus = EventBus(redis_client)
    await event_bus.publish(
        "ws_events",
        {
            "type": "SWARM_STARTED",
            "swarm_run_id": swarm_run_id,
            "data": {"timestamp": "now"},
        },
    )

    try:
        # Resolve tools lists safely mapping agents by their assumed roles
        import os, litellm
        real_key = os.getenv("GROQ_API_KEY_1") or os.getenv("GROQ_API_KEY")
        if real_key and real_key != "dummy_key_for_testing":
            os.environ["GROQ_API_KEY"] = real_key
        # Tell LiteLLM to silently drop unsupported params (e.g. cache_breakpoint on Groq)
        litellm.drop_params = True
        # Additional litellm configuration to drop cache-related parameters
        litellm.set_verbose = False

        planner_tools = []
        retriever_tools = []
        executor_tools = []

        for agent_def in crew_def.agents:
            if "planner" in agent_def.role.lower() or agent_def.role == "planner":
                planner_tools.extend([get_tool(name) for name in agent_def.tools if get_tool(name)])
            elif "retriever" in agent_def.role.lower() or agent_def.role == "retriever":
                retriever_tools.extend([get_tool(name) for name in agent_def.tools if get_tool(name)])
            elif "executor" in agent_def.role.lower() or agent_def.role == "executor":
                executor_tools.extend([get_tool(name) for name in agent_def.tools if get_tool(name)])

        # 3. Create agent structures
        orchestrator = create_orchestrator()
        planner = create_planner(planner_tools)
        retriever = create_retriever(retriever_tools)
        executor = create_executor(executor_tools)
        validator = create_validator()

        # Map delegation logger callbacks
        def custom_delegation_callback(from_agent, to_agent, desc):
            delegation_callback(from_agent, to_agent, desc, swarm_run_id, db_client)

        # Register on crew definition agents
        # 4. Construct Crew
        task1 = Task(
            description=f"Decompose the objective: {objective}",
            expected_output="Task plan layout",
            agent=orchestrator,
        )
        task2 = Task(
            description="Enrich task plan with memory contexts",
            expected_output="Action step sequence",
            agent=planner,
        )
        task3 = Task(
            description="Execute action operations",
            expected_output="API execution output",
            agent=executor,
        )

        crew = Crew(
            agents=[orchestrator, planner, retriever, executor, validator],
            tasks=[task1, task2, task3],
            process=Process.sequential,
            verbose=True,
        )

        # 5. Emit WS task start events so UI populates the checklist
        for agent_name, task_id in [
            ("Orchestrator", "task_orchestrator"),
            ("Planner", "task_planner"),
            ("Executor", "task_executor"),
        ]:
            await event_bus.publish(
                "ws_events",
                {
                    "type": "TASK_STARTED",
                    "swarm_run_id": swarm_run_id,
                    "data": {"task_id": task_id, "agent": agent_name},
                },
            )

        # 6. Kickoff
        result = await crew.kickoff_async()

        # 6. Success - Save result + status to DB
        output_text = str(result)
        logger.info(f"Crew finished. Saving completed status for run {swarm_run_id}")
        await repo.update_swarm_run_status(
            db_client, swarm_run_id, "completed", output_summary=output_text
        )
        logger.info(f"DB status updated to 'completed' for run {swarm_run_id}")

        # Write Markdown Report file
        generate_report(swarm_run_id, result)

        # Publish WebSocket task completions
        for task_id in ["task_orchestrator", "task_planner"]:
            await event_bus.publish(
                "ws_events",
                {
                    "type": "TASK_COMPLETED",
                    "swarm_run_id": swarm_run_id,
                    "data": {"task_id": task_id, "output": "Task completed successfully."},
                },
            )
        # Send actual output for the executor task
        await event_bus.publish(
            "ws_events",
            {
                "type": "TASK_COMPLETED",
                "swarm_run_id": swarm_run_id,
                "data": {"task_id": "task_executor", "output": output_text},
            },
        )

        # Publish WebSocket event FIRST — briefing logic is optional and must not block this
        logger.info(f"Publishing SWARM_COMPLETED event for run {swarm_run_id}")
        await event_bus.publish(
            "ws_events",
            {
                "type": "SWARM_COMPLETED",
                "swarm_run_id": swarm_run_id,
                "data": {"output": output_text},
            },
        )
        logger.info(f"SWARM_COMPLETED event published successfully for run {swarm_run_id}")

        # Optional: Trigger Briefing enqueuing if high priority score
        try:
            run_record = await repo.get_swarm_run(db_client, swarm_run_id)
            p_score = float(run_record.get("priority_score") or 0.0) if run_record else 0.0
            if p_score >= 0.80:
                briefing = BriefingService()
                briefing.enqueue_briefing(swarm_run_id, output_text)
        except Exception as briefing_err:
            logger.warning(f"Briefing check skipped (non-fatal): {briefing_err}")

    except Exception as e:
        logger.error(f"Crew kickoff failed: {str(e)}")
        try:
            await repo.update_swarm_run_status(db_client, swarm_run_id, "failed")
            await event_bus.publish(
                "ws_events",
                {
                    "type": "SWARM_FAILED",
                    "swarm_run_id": swarm_run_id,
                    "data": {"error": str(e)},
                },
            )
        except Exception as cleanup_err:
            logger.error(f"Failed to update failure status: {cleanup_err}")

    finally:
        # Decrement concurrency run counter
        concurrent_key = f"concurrent_runs:{user_id}"
        await redis_client.decr(concurrent_key)
        await redis_client.aclose()
