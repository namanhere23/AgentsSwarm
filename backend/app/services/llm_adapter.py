# STUB-FILL — Implemented by: workstream/2b-llm-adapter-tools
"""
LLM Adapter — Multi-Key Pool + Multi-Provider Failover
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Two-level fallback strategy:

  LEVEL 1 — Intra-provider key rotation:
    Rotate through all API keys registered for a provider
    (GEMINI_API_KEY_1 … GEMINI_API_KEY_N) on 429 / 5xx.

  LEVEL 2 — Inter-provider failover:
    Once ALL keys in a provider's pool are exhausted or
    circuit-broken, move to the next provider chain link.
    Priority: Gemini → Groq → OpenRouter
"""
import os
import asyncio
from openai import AsyncOpenAI
from backend.app.core.logging import get_logger
from backend.app.core.circuit_breaker import (
    check_breaker,
    record_failure,
    record_success,
    CircuitBreakerOpen,
)
from backend.app.core.provider_router import get_preferred_provider
from backend.app.memory.repository import SupabaseRepository

logger = get_logger("llm_adapter")


def _load_key_pool(prefix: str) -> list[str]:
    """
    Load an ordered list of API keys from numbered env vars.
    e.g. prefix='GEMINI_API_KEY' loads GEMINI_API_KEY_1, _2, ... _N
    Stops at the first missing index. Also accepts a bare GEMINI_API_KEY
    as a single-key pool for backward compatibility.
    """
    keys = []
    # Numbered pool (GEMINI_API_KEY_1 ... _N)
    index = 1
    while True:
        key = os.getenv(f"{prefix}_{index}")
        if not key:
            break
        keys.append(key.strip())
        index += 1
    # Bare fallback (backward compat)
    if not keys:
        bare = os.getenv(prefix, "")
        if bare.strip():
            keys.append(bare.strip())
    return keys


# Provider pool definitions
# Each entry: (provider_name, base_url, model_name, key_pool)
PROVIDER_POOLS = [
    (
        "gemini",
        "https://generativelanguage.googleapis.com/v1beta/openai/",
        "gemini-1.5-flash",
        _load_key_pool("GEMINI_API_KEY"),
    ),
    (
        "groq",
        "https://api.groq.com/openai/v1",
        "llama-3.3-70b-versatile",
        _load_key_pool("GROQ_API_KEY"),
    ),
    (
        "openrouter",
        "https://openrouter.ai/api/v1",
        "mistralai/mistral-7b-instruct:free",
        _load_key_pool("OPENROUTER_API_KEY"),
    ),
]


class LLMAdapter:
    def __init__(
        self,
        model: str = "gemini-1.5-flash",
        temperature: float = 0.0,
        max_tokens: int = 512,
        agent_role: str = "_default",
    ):
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.agent_role = agent_role

    def _build_client(self, base_url: str, api_key: str) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def complete(
        self,
        messages: list,
        trace_id: str,
        redis_client=None,
        supabase_client=None,
    ) -> str:
        """
        Execute prompt completion with two-level fallback:
          Level 1 — intra-provider: rotate through every API key in pool.
          Level 2 — inter-provider: try Gemini → Groq → OpenRouter.

        Raises CircuitBreakerOpen only when ALL providers AND all their
        keys are exhausted.
        """
        # Resolve preferred provider from SmartRouter and re-order pools
        preferred_provider, _ = get_preferred_provider(self.agent_role)
        ordered_pools = sorted(
            PROVIDER_POOLS,
            key=lambda p: (0 if p[0] == preferred_provider else 1),
        )

        last_error: Exception | None = None

        for provider_name, base_url, default_model, key_pool in ordered_pools:
            if not key_pool:
                logger.warning(
                    f"No API keys configured for provider '{provider_name}'. Skipping."
                )
                continue

            # ━━ Level 1: Intra-provider key rotation ━━━━━━━━━━━━━━━━━━━━
            for key_index, api_key in enumerate(key_pool, start=1):
                breaker_key = f"{provider_name}:{key_index}"

                # Per-key circuit breaker check
                if redis_client:
                    try:
                        await check_breaker(redis_client, breaker_key)
                    except CircuitBreakerOpen:
                        logger.warning(
                            f"Circuit breaker OPEN for {provider_name} key #{key_index}. "
                            f"Rotating to next key."
                        )
                        continue

                client = self._build_client(base_url, api_key)
                try:
                    response = await asyncio.wait_for(
                        client.chat.completions.create(
                            model=default_model,
                            messages=messages,
                            temperature=self.temperature,
                            max_tokens=self.max_tokens,
                        ),
                        timeout=25.0,
                    )

                    # Success — reset per-key circuit breaker
                    if redis_client:
                        await record_success(redis_client, breaker_key)

                    # Audit log
                    usage = response.usage
                    if supabase_client and usage:
                        await SupabaseRepository().insert_audit_log(
                            supabase_client,
                            {
                                "tool_name": f"LLM_{provider_name}",
                                "input_payload": {
                                    "model": default_model,
                                    "provider": provider_name,
                                    "key_index": key_index,
                                    "trace_id": trace_id,
                                },
                                "output_payload": {
                                    "prompt_tokens": usage.prompt_tokens,
                                    "completion_tokens": usage.completion_tokens,
                                },
                            },
                        )

                    logger.info(
                        f"LLM success: provider={provider_name} key_index={key_index} "
                        f"model={default_model} trace_id={trace_id}"
                    )
                    return response.choices[0].message.content

                except Exception as e:
                    last_error = e
                    logger.warning(
                        f"Provider {provider_name} key #{key_index} failed: {e}. "
                        f"Rotating to next key."
                    )
                    if redis_client:
                        await record_failure(redis_client, breaker_key)
                    await asyncio.sleep(0.5)  # brief back-off before next key

            logger.warning(
                f"All {len(key_pool)} key(s) for provider '{provider_name}' exhausted. "
                f"Moving to next provider."
            )

        # ━━ All providers and all keys failed ━━━━━━━━━━━━━━━━━━━━━━━━━━
        raise CircuitBreakerOpen(
            f"All LLM providers and key pools exhausted. Last error: {last_error}"
        )
