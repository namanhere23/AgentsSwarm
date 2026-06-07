from apscheduler.schedulers.background import BackgroundScheduler
from croniter import croniter
from datetime import datetime, timezone
from redis.asyncio import Redis
from backend.app.core.config import settings
from backend.app.core.event_bus import EventBus
from backend.app.core.supabase_client import get_supabase_client
from backend.app.core.logging import get_logger

logger = get_logger("scheduler_service")


class SwarmScheduler:
    """Monitors scheduled_swarms tables and enqueues runs that are due."""

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone="UTC")
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

    def shutdown(self):
        self.scheduler.shutdown()

    async def check_scheduled_swarms(self):
        """Query Postgres, parse schedules, and enqueue due runs."""
        db = get_supabase_client(
            "service_token"
        )  # Service account bypass for scheduled loops

        now = datetime.now(timezone.utc)
        response = (
            db.table("scheduled_swarms").select("*").eq("is_active", True).execute()
        )

        if not response.data:
            return

        event_bus = EventBus(self.redis_client)

        for sched in response.data:
            cron_expr = sched["cron_expression"]

            # Check if execution is due in the current 60s window
            if croniter.is_valid(cron_expr):
                # Fetch last execution date or default to created time
                base_time = sched.get("created_at")
                if not base_time:
                    continue
                # Parse cron next check
                try:
                    iter_check = croniter(
                        cron_expr,
                        start_time=datetime.fromisoformat(
                            base_time.replace("Z", "+00:00")
                        ),
                    )
                    next_run = iter_check.get_next(datetime)

                    # Check if next_run matches current minute range
                    if (
                        next_run.year == now.year
                        and next_run.month == now.month
                        and next_run.day == now.day
                        and next_run.hour == now.hour
                        and next_run.minute == now.minute
                    ):

                        logger.info(
                            f"Scheduled run due: crew={sched['crew_id']}, objective={sched['objective']}"
                        )

                        # 1. Create run record
                        run_res = (
                            db.table("swarm_runs")
                            .insert(
                                {
                                    "user_id": sched["user_id"],
                                    "crew_id": sched["crew_id"],
                                    "objective": sched["objective"],
                                    "status": "queued",
                                }
                            )
                            .execute()
                        )

                        if run_res.data:
                            run_id = run_res.data[0]["id"]

                            # 2. Increment concurrent counter
                            concurrent_key = f"concurrent_runs:{sched['user_id']}"
                            await self.redis_client.incr(concurrent_key)

                            # 3. Publish to queue stream
                            await event_bus.publish(
                                "swarm_queue",
                                {
                                    "swarm_run_id": run_id,
                                    "user_id": sched["user_id"],
                                    "token": "service_token",
                                },
                            )
                except Exception as e:
                    logger.error(
                        f"Error evaluating cron {cron_expr} for {sched.get('id')}: {e}"
                    )
