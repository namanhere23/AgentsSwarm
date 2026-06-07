# NEW — Implemented by: workstream/2b-llm-adapter-tools
"""
LLM Response Cache — Demo Reliability Layer
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Caches every LLM API response to disk using MD5 hashing.
If the API is down during a live demo, cached responses are
served transparently.
"""

import json
import hashlib
import os
import logging
from pathlib import Path
from typing import Any, Callable, Optional

logger = logging.getLogger("ResponseCache")
CACHE_VERSION = "v1"

class ResponseCache:
    def __init__(self, cache_dir: str = ".demo_cache", enabled: bool = True):
        self.cache_dir = Path(cache_dir)
        self.enabled = enabled
        if self.enabled:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _make_key(self, prompt: str, model: str = "") -> str:
        raw = f"{CACHE_VERSION}::{model}::{prompt}"
        return hashlib.md5(raw.encode()).hexdigest()

    def get(self, prompt: str, model: str = "") -> dict | None:
        if not self.enabled: return None
        cache_file = self.cache_dir / f"{self._make_key(prompt, model)}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    logger.info("[CACHE HIT] Serving from local disk cache.")
                    return json.load(f)
            except Exception:
                pass
        return None

    def put(self, prompt: str, response: dict, model: str = ""):
        if not self.enabled: return
        cache_file = self.cache_dir / f"{self._make_key(prompt, model)}.json"
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(response, f, indent=2, default=str)
        except OSError as e:
            logger.warning(f"Cache write failed: {e}")

    async def get_or_call(self, prompt: str, func: Callable, *args, model: str = "", **kwargs) -> Any:
        cached = self.get(prompt, model)
        if cached is not None:
            return cached
        result = await func(*args, **kwargs)
        if isinstance(result, dict) or isinstance(result, str):
            self.put(prompt, {"result": result} if isinstance(result, str) else result, model)
        return result
