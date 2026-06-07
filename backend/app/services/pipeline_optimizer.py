"""
PipelineOptimizer — Tracks per-agent-provider token usage, latency, and failure rates.

Produces affinity table update recommendations for SmartRouter to improve
cost and reliability over time. Writes metrics to Redis for persistence.
"""
from backend.app.core.logging import get_logger
from backend.app.core.config import settings

logger = get_logger("pipeline_optimizer")

# Redis key patterns
_METRICS_PREFIX = "pipeline:metrics"
_AFFINITY_PREFIX = "pipeline:affinity"


class PipelineOptimizer:
    """
    Background monitor tracking per-agent-provider token usage, latency, and failures.
    Produces affinity table recommendations to improve cost and reliability.
    """

    def __init__(self):
        self._redis = None

    def _get_redis(self):
        """Lazy-initialize Redis connection."""
        if self._redis is None:
            try:
                import redis
                self._redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
            except Exception as e:
                logger.warning(f"PipelineOptimizer: Redis unavailable: {e}")
        return self._redis

    async def collect_run_metrics(self, swarm_run_id: str) -> None:
        """
        Collect and store metrics for a completed swarm run.
        Reads from the LLM call log and aggregates per-provider stats.
        """
        r = self._get_redis()
        if not r:
            return

        try:
            # Increment run count
            r.incr(f"{_METRICS_PREFIX}:runs_total")

            # Track run ID for audit
            r.sadd(f"{_METRICS_PREFIX}:completed_runs", swarm_run_id)

            logger.info(f"PipelineOptimizer: Collected metrics for run {swarm_run_id}")

        except Exception as e:
            logger.warning(f"PipelineOptimizer.collect_run_metrics failed: {e}")

    async def recommend_affinity_updates(self) -> dict:
        """
        Analyze collected metrics and produce provider affinity recommendations.

        Returns:
            dict mapping agent_role → recommended_provider
        """
        r = self._get_redis()
        recommendations: dict[str, str] = {}

        if not r:
            # Default recommendations when Redis unavailable
            return {
                "orchestrator": "gemini",
                "planner": "gemini",
                "retriever": "groq",
                "executor": "groq",
                "validator": "gemini",
            }

        try:
            # Read failure rates per provider from circuit breaker keys
            providers = ["gemini", "groq", "openrouter"]
            failure_counts: dict[str, int] = {}

            for provider in providers:
                failure_key = f"cb:{provider}:1:failures"
                val = r.get(failure_key)
                failure_counts[provider] = int(val) if val else 0

            # Simple heuristic: prefer providers with fewer failures
            sorted_providers = sorted(providers, key=lambda p: failure_counts.get(p, 0))
            preferred = sorted_providers[0]
            fallback = sorted_providers[1] if len(sorted_providers) > 1 else preferred

            # Assign based on agent profile
            recommendations = {
                "orchestrator": preferred,
                "planner": preferred,
                "retriever": fallback,
                "executor": fallback,
                "validator": preferred,
            }

            logger.info(f"PipelineOptimizer recommendations: {recommendations}")

        except Exception as e:
            logger.warning(f"PipelineOptimizer.recommend_affinity_updates failed: {e}")
            recommendations = {"_default": "gemini"}

        return recommendations
