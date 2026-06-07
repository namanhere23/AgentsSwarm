# STUB — Implemented by: workstream/0-architect
from pydantic import BaseModel
from typing import Literal, Dict


class RateLimitStatus(BaseModel):
    gemini_tokens_used_today: int
    groq_requests_used_today: int
    serper_searches_used_month: int


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded"]
    components: Dict[str, Literal["up", "down"]]
    rate_limits: RateLimitStatus
