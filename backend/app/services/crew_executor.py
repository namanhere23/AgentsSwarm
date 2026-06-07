import asyncio
import copy
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


def _bind_tool_context(tool_name: str, swarm_run_id: str, user_id: str, token: str):
    tool = get_tool(tool_name)
    if not tool:
        return None

    bound_tool = copy.copy(tool)
    if hasattr(bound_tool, "swarm_run_id"):
        bound_tool.swarm_run_id = swarm_run_id
    if hasattr(bound_tool, "user_id"):
        bound_tool.user_id = user_id
    if hasattr(bound_tool, "token"):
        bound_tool.token = token
    return bound_tool


def _task_descriptor(task: Task) -> dict:
    return {
        "task_id": str(task.id),
        "agent": task.agent.role if task.agent else "Unknown",
        "description": task.description,
    }


def _publish_trace_event(
    loop: asyncio.AbstractEventLoop,
    event_bus: EventBus,
    swarm_run_id: str,
    event_type: str,
    data: dict,
) -> None:
    try:
        future = asyncio.run_coroutine_threadsafe(
            event_bus.publish(
                "ws_events",
                {
                    "type": event_type,
                    "swarm_run_id": swarm_run_id,
                    "data": data,
                },
            ),
            loop,
        )
        future.result(timeout=5)
    except Exception as exc:
        logger.warning(f"Failed to publish trace event '{event_type}': {exc}")


async def execute_crew(
    swarm_run_id: str, crew_def, objective: str, user_id: str, token: str
) -> None:
    """Instantiates the Crew topology and executes kickoff within the psycopg Saver thread context."""
    db_client = get_supabase_client(token)
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

    task_descriptors: list[dict] = []
    current_task_index = {"value": 0}

    try:
        # Resolve tools lists safely mapping agents by their assumed roles
        planner_tools = []
        retriever_tools = []
        executor_tools = []

        for agent_def in crew_def.agents:
            if "planner" in agent_def.role.lower() or agent_def.role == "planner":
                for name in agent_def.tools:
                    tool = _bind_tool_context(name, swarm_run_id, user_id, token)
                    if tool:
                        planner_tools.append(tool)
            elif "retriever" in agent_def.role.lower() or agent_def.role == "retriever":
                for name in agent_def.tools:
                    tool = _bind_tool_context(name, swarm_run_id, user_id, token)
                    if tool:
                        retriever_tools.append(tool)
            elif "executor" in agent_def.role.lower() or agent_def.role == "executor":
                for name in agent_def.tools:
                    tool = _bind_tool_context(name, swarm_run_id, user_id, token)
                    if tool:
                        executor_tools.append(tool)

        # 3. Create agent structures
        orchestrator = create_orchestrator()
        planner = create_planner(planner_tools)
        retriever = create_retriever(retriever_tools)
        executor = create_executor(executor_tools)
        validator = create_validator()

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

        trace_tasks = [task1, task2, task3]
        task_descriptors = [_task_descriptor(task) for task in trace_tasks]
        loop = asyncio.get_running_loop()

        def task_callback(task_output):
            idx = current_task_index["value"]
            if idx >= len(task_descriptors):
                return

            descriptor = task_descriptors[idx]
            _publish_trace_event(
                loop,
                event_bus,
                swarm_run_id,
                "TASK_COMPLETED",
                {
                    **descriptor,
                    "output": getattr(task_output, "raw_output", str(task_output)),
                },
            )

            current_task_index["value"] = idx + 1
            if current_task_index["value"] < len(task_descriptors):
                _publish_trace_event(
                    loop,
                    event_bus,
                    swarm_run_id,
                    "TASK_STARTED",
                    task_descriptors[current_task_index["value"]],
                )

        crew = Crew(
            agents=[planner, retriever, executor, validator],
            tasks=trace_tasks,
            process=Process.hierarchical,
            manager_agent=orchestrator,
            task_callback=task_callback,
            verbose=True,
        )

        await event_bus.publish(
            "ws_events",
            {
                "type": "TRACE_BOOTSTRAP",
                "swarm_run_id": swarm_run_id,
                "data": {
                    "tasks": [
                        {**descriptor, "status": "pending"}
                        for descriptor in task_descriptors
                    ]
                },
            },
        )
        if task_descriptors:
            await event_bus.publish(
                "ws_events",
                {
                    "type": "TASK_STARTED",
                    "swarm_run_id": swarm_run_id,
                    "data": task_descriptors[0],
                },
            )

        # 5. Kickoff (Run synchronous crewai kickoff in a background thread)
        result = await asyncio.to_thread(crew.kickoff)

        # 6. Success - Save reports
        output_text = str(result)
        await repo.update_swarm_run_status(
            db_client, swarm_run_id, "completed", output_summary=output_text
        )

        # Write Markdown Report file
        generate_report(swarm_run_id, result)

        # Trigger Briefing enqueuing if high priority score
        run_record = await repo.get_swarm_run(db_client, swarm_run_id)
        p_score = run_record.get("priority_score", 0.0) if run_record else 0.0
        if p_score >= 0.80:
            briefing = BriefingService()
            briefing.enqueue_briefing(swarm_run_id, output_text)

        await event_bus.publish(
            "ws_events",
            {
                "type": "SWARM_COMPLETED",
                "swarm_run_id": swarm_run_id,
                "data": {"output": output_text},
            },
        )

    except Exception as e:
        logger.error(f"Crew kickoff failed: {str(e)}")
        await repo.update_swarm_run_status(db_client, swarm_run_id, "failed")
        await event_bus.publish(
            "ws_events",
            {
                "type": "SWARM_FAILED",
                "swarm_run_id": swarm_run_id,
                "data": {"error": str(e)},
            },
        )

    finally:
        # Decrement concurrency run counter
        concurrent_key = f"concurrent_runs:{user_id}"
        await redis_client.decr(concurrent_key)
        await redis_client.aclose()
