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

    try:
        async for message in event_bus.consume(
            "swarm_queue", "crew_worker_group", "worker_node_1"
        ):
            logger.info(f"Received swarm execution task for run: {message.get('swarm_run_id')}")
            swarm_run_id = message.get("swarm_run_id")
            user_id = message.get("user_id")

            # Load details — use service account key (no JWT in queue)
            db = get_supabase_client()
            repo = SupabaseRepository()
            try:
                logger.info(f"Fetching run {swarm_run_id} from DB...")
                run = await repo.get_swarm_run(db, swarm_run_id)
                if not run:
                    logger.error(f"Swarm run {swarm_run_id} details not found.")
                    continue
                logger.info(f"Run found: crew={run['crew_id']}")
            except Exception as e:
                logger.error(f"Error fetching run {swarm_run_id} from DB: {e}")
                continue

            crew_def = get_crew(run["crew_id"])
            if not crew_def:
                logger.error(f"Crew definition {run['crew_id']} not registered.")
                continue

            # Execute run as a background task so the consumer loop
            # is NOT blocked and can immediately pick up the next message.
            msg_id = message.get("_msg_id")

            async def _run_and_ack(run_id, crew, objective, uid, mid):
                try:
                    await execute_crew(run_id, crew, objective, uid)
                    if mid:
                        await redis_client.xack("swarm_queue", "crew_worker_group", mid)
                except Exception as e:
                    logger.error(f"Error handling task execution for {run_id}: {str(e)}")

            asyncio.create_task(
                _run_and_ack(swarm_run_id, crew_def, run["objective"], user_id, msg_id)
            )
    finally:
        await redis_client.aclose()
        logger.info("Crew consumer shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
