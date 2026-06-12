from apscheduler.schedulers.asyncio import AsyncIOScheduler
from croniter import croniter
from datetime import datetime, timezone
from redis.asyncio import Redis
from fastapi.concurrency import run_in_threadpool
from backend.app.core.config import settings
from backend.app.core.event_bus import EventBus
from backend.app.core.supabase_client import get_supabase_client
from backend.app.core.logging import get_logger

logger = get_logger("scheduler_service")


class SwarmScheduler:
    """Monitors scheduled_swarms tables and enqueues runs that are due."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone="UTC")
        self.redis_client = None

    def start(self):
        self.redis_client = Redis.from_url(settings.REDIS_URL)
        # Check triggers every 60 seconds
        self.scheduler.add_job(
            self.check_scheduled_swarms,
            "interval",
            seconds=60,
            id="swarm_schedule_checker",
        )
        self.scheduler.start()
        logger.info("APScheduler background service initialized.")

    async def shutdown(self):
        self.scheduler.shutdown()
        if self.redis_client:
            await self.redis_client.aclose()

    async def check_scheduled_swarms(self):
        """Query Postgres, parse schedules, and enqueue due runs."""
        db = get_supabase_client()  # Service key bypass for scheduled loops

        now = datetime.now(timezone.utc)

        # Run sync Supabase call in threadpool to avoid blocking the event loop
        response = await run_in_threadpool(
            lambda: db.table("scheduled_swarms").select("*").eq("is_active", True).execute()
        )

        if not response.data:
            return

        event_bus = EventBus(self.redis_client)

        for sched in response.data:
            cron_expr = sched.get("cron_expression", "")

            if not croniter.is_valid(cron_expr):
                continue

            # Use last_run_at if available, fall back to created_at
            # This ensures cron always advances from the last actual run
            base_time_str = sched.get("last_run_at") or sched.get("created_at")
            if not base_time_str:
                continue

            try:
                base_time = datetime.fromisoformat(base_time_str.replace("Z", "+00:00"))
                iter_check = croniter(cron_expr, start_time=base_time)
                next_run = iter_check.get_next(datetime)

                # Ensure next_run is timezone-aware for comparison
                if next_run.tzinfo is None:
                    next_run = next_run.replace(tzinfo=timezone.utc)

                # Fire if next_run falls within the current 60s window
                delta_seconds = (now - next_run).total_seconds()
                if 0 <= delta_seconds < 60:
                    logger.info(
                        f"Scheduled run due: crew={sched['crew_id']}, objective={sched['objective']}"
                    )

                    # 1. Create run record (sync → threadpool)
                    run_res = await run_in_threadpool(
                        lambda: db.table("swarm_runs").insert({
                            "user_id": sched["user_id"],
                            "crew_id": sched["crew_id"],
                            "objective": sched["objective"],
                            "status": "queued",
                        }).execute()
                    )

                    if run_res.data:
                        run_id = run_res.data[0]["id"]

                        # 2. Update last_run_at so next check advances correctly
                        await run_in_threadpool(
                            lambda: db.table("scheduled_swarms")
                            .update({"last_run_at": now.isoformat()})
                            .eq("id", sched["id"])
                            .execute()
                        )

                        # 3. Increment concurrent counter
                        concurrent_key = f"concurrent_runs:{sched['user_id']}"
                        await self.redis_client.incr(concurrent_key)

                        # 4. Publish to queue stream
                        await event_bus.publish(
                            "swarm_queue",
                            {
                                "swarm_run_id": run_id,
                                "user_id": sched["user_id"],
                                # token intentionally omitted — workers use service account
                            },
                        )
                        logger.info(f"Scheduled swarm {run_id} enqueued successfully.")

            except Exception as e:
                logger.error(
                    f"Error evaluating cron {cron_expr} for {sched.get('id')}: {e}"
                )
