# STUB-FILL — Implemented by: workstream/1a-backend-core
import httpx
from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from backend.app.models.health_models import HealthResponse, RateLimitStatus
from backend.app.core.config import settings

router = APIRouter(prefix="/health", tags=["health"])


# Local helper to resolve Redis client injection
async def get_redis():
    client = Redis.from_url(settings.REDIS_URL)
    try:
        yield client
    finally:
        await client.aclose()


@router.get("", response_model=HealthResponse)
async def get_health(redis_client: Redis = Depends(get_redis)):
    """Verifies reachability of the database, Redis, ChromaDB, and APIs."""
    components = {}

    # 1. Redis check
    try:
        await redis_client.ping()
        components["redis"] = "up"
    except Exception:
        components["redis"] = "down"

    # 2. Supabase Postgres check
    # Note: Using httpx directly to ping REST endpoint
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/",
                headers={"apikey": settings.SUPABASE_SERVICE_KEY},
            )
            components["database"] = "up" if res.status_code == 200 else "down"
    except Exception:
        components["database"] = "down"

    # 3. ChromaDB check
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"http://{settings.CHROMA_HOST}:{settings.CHROMA_PORT}/api/v1/heartbeat"
            )
            components["chromadb"] = "up" if res.status_code == 200 else "down"
    except Exception:
        components["chromadb"] = "down"

    # 4. Gemini API check
    try:
        async with httpx.AsyncClient() as client:
            res = await client.head(
                "https://generativelanguage.googleapis.com/v1beta/openai/", timeout=3.0
            )
            components["gemini_api"] = "up" if res.status_code < 500 else "down"
    except Exception:
        components["gemini_api"] = "down"

    # 5. Groq API check
    try:
        async with httpx.AsyncClient() as client:
            res = await client.head("https://api.groq.com/openai/v1", timeout=3.0)
            components["groq_api"] = "up" if res.status_code < 500 else "down"
    except Exception:
        components["groq_api"] = "down"

    # 6. Serper check
    try:
        async with httpx.AsyncClient() as client:
            res = await client.head("https://google.serper.dev", timeout=3.0)
            components["serper_api"] = "up" if res.status_code < 500 else "down"
    except Exception:
        components["serper_api"] = "down"

    # Fallback / degrading check
    status = "healthy"
    if components["database"] == "down" or components["gemini_api"] == "down":
        raise HTTPException(status_code=503, detail="Primary services unavailable")
    elif components["redis"] == "down":
        status = "degraded"

    # Read real rate-limit counters from Redis
    gemini_tokens = 0
    groq_requests = 0
    serper_searches = 0
    try:
        gemini_tokens = int(await redis_client.get("rate:gemini:tokens_today") or 0)
        groq_requests = int(await redis_client.get("rate:groq:requests_today") or 0)
        serper_searches = int(await redis_client.get("rate:serper:searches_month") or 0)
    except Exception:
        pass  # Redis counters not yet populated; return zeros

    rate_limits = RateLimitStatus(
        gemini_tokens_used_today=gemini_tokens,
        groq_requests_used_today=groq_requests,
        serper_searches_used_month=serper_searches,
    )

    return HealthResponse(status=status, components=components, rate_limits=rate_limits)
