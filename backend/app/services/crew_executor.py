# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
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

    try:
        # Resolve tools lists
        planner_tools = [
            get_tool(name) for name in crew_def.agents[1].tools if get_tool(name)
        ]
        retriever_tools = [
            get_tool(name) for name in crew_def.agents[2].tools if get_tool(name)
        ]
        executor_tools = [
            get_tool(name) for name in crew_def.agents[3].tools if get_tool(name)
        ]

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
            process=Process.hierarchical,
            manager_agent=orchestrator,
            verbose=True,
        )

        # 5. Kickoff
        result = crew.kickoff()

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

    finally:
        # Decrement concurrency run counter
        concurrent_key = f"concurrent_runs:{user_id}"
        await redis_client.decr(concurrent_key)
        await redis_client.aclose()
