# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
import asyncio
from redis.asyncio import Redis
from backend.app.core.config import settings
from backend.app.core.event_bus import EventBus
from backend.app.core.crew_registry import load_crews, get_crew
from backend.app.memory.repository import SupabaseRepository
from backend.app.core.supabase_client import get_supabase_client
from backend.app.services.crew_executor import execute_crew
from backend.app.core.logging import get_logger

logger = get_logger("crew_worker")


async def main():
    logger.info("Initializing Crew Execution worker...")
    load_crews()  # Start watchdog watcher

    redis_client = Redis.from_url(settings.REDIS_URL)
    event_bus = EventBus(redis_client)

    async for message in event_bus.consume(
        "swarm_queue", "crew_worker_group", "worker_node_1"
    ):
        logger.info(f"Received swarm execution task message: {message}")
        swarm_run_id = message.get("swarm_run_id")
        user_id = message.get("user_id")
        token = message.get("token")

        # Load details
        db = get_supabase_client(token)
        repo = SupabaseRepository()
        run = await repo.get_swarm_run(db, swarm_run_id)
        if not run:
            logger.error(f"Swarm run {swarm_run_id} details not found.")
            continue

        crew_def = get_crew(run["crew_id"])
        if not crew_def:
            logger.error(f"Crew definition {run['crew_id']} not registered.")
            continue

        # Execute run in async task context
        try:
            await execute_crew(swarm_run_id, crew_def, run["objective"], user_id, token)
            # Acknowledge Redis message
            msg_id = message.get("_msg_id")
            if msg_id:
                await redis_client.xack("swarm_queue", "crew_worker_group", msg_id)
        except Exception as e:
            logger.error(f"Error handling task execution: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())
