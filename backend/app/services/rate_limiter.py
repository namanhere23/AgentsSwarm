# STUB-FILL — Implemented by: workstream/1a-backend-core
import yaml
from fastapi import HTTPException
from redis.asyncio import Redis
from backend.app.core.logging import get_logger

logger = get_logger("rate_limiter")


class RateLimiter:
    def __init__(self, limits_config_path: str = "config/rate_limits.yaml"):
        with open(limits_config_path, "r") as f:
            self.config = yaml.safe_load(f)

    async def check_tool_rate_limit(
        self, redis_client: Redis, tool_name: str, user_id: str
    ) -> None:
        """Enforces Serper and other tool limits in a sliding Redis window."""
        tool_cfg = self.config.get("tools", {}).get(tool_name)
        if not tool_cfg or "requests_per_hour" not in tool_cfg:
            return  # Unlimited if not configured

        limit = tool_cfg["requests_per_hour"]
        key = f"rate_limit:tool:{tool_name}:{user_id}"

        # Simple hourly sliding window using redis INCR
        current = await redis_client.get(key)
        if current and int(current) >= limit:
            ttl = await redis_client.ttl(key)
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for tool {tool_name}. Try again later.",
                headers={"Retry-After": str(ttl if ttl > 0 else 60)},
            )

        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, 3600, nx=True)
        await pipe.execute()

    async def check_llm_rate_limit(
        self, redis_client: Redis, provider: str, user_id: str
    ) -> None:
        """Enforce daily token limits per LLM provider."""
        provider_cfg = self.config.get("providers", {}).get(provider)
        if not provider_cfg or "tokens_per_day" not in provider_cfg:
            return

        limit = provider_cfg["tokens_per_day"]
        key = f"rate_limit:llm:{provider}:{user_id}"

        current = await redis_client.get(key)
        if current and int(current) >= limit:
            ttl = await redis_client.ttl(key)
            raise HTTPException(
                status_code=429,
                detail=f"Daily rate limit exceeded for provider {provider}.",
                headers={"Retry-After": str(ttl if ttl > 0 else 86400)},
            )

    async def get_rate_limit_stats(self, redis_client: Redis, user_id: str) -> dict:
        """Fetch current rate limit consumption counters."""
        gemini_used = await redis_client.get(f"rate_limit:llm:gemini:{user_id}")
        groq_used = await redis_client.get(f"rate_limit:llm:groq:{user_id}")
        serper_used = await redis_client.get(f"rate_limit:tool:WebSearchTool:{user_id}")

        return {
            "gemini_tokens_used_today": int(gemini_used) if gemini_used else 0,
            "groq_requests_used_today": int(groq_used) if groq_used else 0,
            "serper_searches_used_month": int(serper_used) if serper_used else 0,
        }
