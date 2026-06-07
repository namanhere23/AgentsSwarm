# STUB-FILL — Implemented by: workstream/1a-backend-core
from datetime import datetime
from redis.asyncio import Redis


class CircuitBreakerOpen(Exception):
    pass


async def check_breaker(redis_client: Redis, api_name: str) -> None:
    """Checks breaker state in Redis. Raises CircuitBreakerOpen if open."""
    key = f"circuit_breaker:{api_name}"
    state = await redis_client.hget(key, "state")
    if state == b"open":
        raise CircuitBreakerOpen(f"Circuit breaker is OPEN for provider: {api_name}")


async def record_failure(redis_client: Redis, api_name: str) -> None:
    """Increments failures, opening breaker if threshold >= 3 is hit."""
    key = f"circuit_breaker:{api_name}"
    failures = await redis_client.hincrby(key, "failures", 1)
    await redis_client.hset(key, "last_failure", datetime.utcnow().isoformat())

    if failures >= 3:
        await redis_client.hset(key, "state", "open")
        await redis_client.expire(key, 1800)  # Open for 30 minutes


async def record_success(redis_client: Redis, api_name: str) -> None:
    """Resets breaker failure counter and closes circuit."""
    key = f"circuit_breaker:{api_name}"
    await redis_client.hset(key, "failures", 0)
    await redis_client.hset(key, "state", "closed")
