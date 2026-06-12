"""
LLM Configuration Helper
Provides explicit LLM objects for CrewAI 0.41.1 with manual fallback support.

Architecture:
  - ResilientChatLiteLLM: Custom subclass that overrides _generate/_stream
    with try/except fallback chains. This avoids:
      1. RunnableWithFallbacks pydantic crash (from .with_fallbacks())
      2. Coroutine iteration crash (from model_kwargs fallbacks)
    CrewAI 0.41.1 sees it as a plain ChatLiteLLM (passes validation).
"""
import os
import logging
from typing import Any, Dict, Iterator, List, Optional

import litellm
from langchain_community.chat_models import ChatLiteLLM
from langchain_core.outputs import ChatResult

# Ensure litellm drops unsupported params before any LLM initialization
litellm.drop_params = True
litellm.set_verbose = False
os.environ["LITELLM_CACHE"] = "false"
os.environ["LITELLM_DROP_PARAMS"] = "true"

# Ensure API keys are loaded into environ for LiteLLM
if os.getenv("OPENROUTER_API_KEY_1"):
    os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY_1")
if os.getenv("GROQ_API_KEY_1"):
    os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY_1")
if os.getenv("GEMINI_API_KEY_1"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY_1")

logger = logging.getLogger("llm_fallback")


class ResilientChatLiteLLM(ChatLiteLLM):
    """
    ChatLiteLLM subclass with manual try/except fallback chains.
    Compatible with CrewAI 0.41.1 (avoids RunnableWithFallbacks pydantic issues).

    Fallback order: primary model → fallback_configs[0] → fallback_configs[1] → ...
    """

    fallback_configs: List[Dict[str, Any]] = []

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        try:
            return super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        except Exception as primary_err:
            logger.warning(
                f"Primary LLM [{self.model}] failed ({type(primary_err).__name__}: {str(primary_err)[:120]}), trying fallbacks..."
            )
            for i, cfg in enumerate(self.fallback_configs):
                try:
                    fb = ChatLiteLLM(**cfg)
                    result = fb._generate(messages, stop=stop, **kwargs)
                    logger.info(f"Fallback {i + 1} succeeded: {cfg.get('model')}")
                    return result
                except Exception as fb_err:
                    logger.warning(f"Fallback {i + 1} [{cfg.get('model')}] failed: {str(fb_err)[:80]}")
            raise primary_err

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        try:
            yield from super()._stream(messages, stop=stop, run_manager=run_manager, **kwargs)
        except Exception as primary_err:
            logger.warning(
                f"Primary LLM [{self.model}] stream failed ({type(primary_err).__name__}: {str(primary_err)[:120]}), trying fallbacks..."
            )
            for i, cfg in enumerate(self.fallback_configs):
                try:
                    fb = ChatLiteLLM(**cfg)
                    yield from fb._stream(messages, stop=stop, **kwargs)
                    return
                except Exception as fb_err:
                    logger.warning(f"Fallback {i + 1} stream [{cfg.get('model')}] failed: {str(fb_err)[:80]}")
            raise primary_err


def _openrouter_cfg() -> Dict[str, Any]:
    """Returns OpenRouter fallback config dict."""
    return {
        "model": "openrouter/meta-llama/llama-3.3-70b-instruct:free",
        "api_key": os.getenv("OPENROUTER_API_KEY_1") or os.getenv("OPENROUTER_API_KEY") or "dummy",
        "temperature": 0.7,
    }


def get_groq_llm(model: str = "llama-3.3-70b-versatile") -> ResilientChatLiteLLM:
    """
    Returns a Groq LLM with automatic fallback to OpenRouter.
    Groq (llama-3.3-70b) → OpenRouter (mistral-7b-free)
    """
    litellm.drop_params = True
    return ResilientChatLiteLLM(
        model=f"groq/{model}",
        api_key=os.getenv("GROQ_API_KEY_1") or os.getenv("GROQ_API_KEY") or "dummy",
        temperature=0.7,
        max_retries=0,
        fallback_configs=[_openrouter_cfg()],
    )


def get_gemini_llm(model: str = "gemini-1.5-flash") -> ResilientChatLiteLLM:
    """
    Returns a Gemini LLM with automatic fallback to OpenRouter.
    Gemini (1.5-flash) → OpenRouter (mistral-7b-free)
    """
    litellm.drop_params = True
    return ResilientChatLiteLLM(
        model=f"gemini/{model}",
        api_key=os.getenv("GEMINI_API_KEY_1") or os.getenv("GEMINI_API_KEY") or "dummy",
        temperature=0.7,
        max_retries=0,
        fallback_configs=[_openrouter_cfg()],
    )
