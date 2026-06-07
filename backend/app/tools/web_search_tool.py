# STUB-FILL — Implemented by: workstream/2b-llm-adapter-tools
import os
import json
import httpx
from backend.app.tools.base import SwarmTool
from backend.app.services.rate_limiter import RateLimiter
from backend.app.core.config import settings


class WebSearchTool(SwarmTool):
    name = "WebSearchTool"
    description = (
        "Performs real-time web searches using the Serper API. "
        "Input: search query string. Output: JSON array of top-5 organic search results "
        "with title, url, and snippet fields."
    )

    async def _run(self, input: str, redis_client=None, user_id: str = None) -> str:
        # 1. Mock Check Guard
        if os.getenv("MOCK_TOOLS", "false").lower() == "true":
            return json.dumps(
                [
                    {
                        "title": "Mock Result 1",
                        "url": "https://example.com/1",
                        "snippet": "Mock search snippet 1",
                    },
                    {
                        "title": "Mock Result 2",
                        "url": "https://example.com/2",
                        "snippet": "Mock search snippet 2",
                    },
                ]
            )

        # 2. Check Rate Limit
        if redis_client and user_id:
            limiter = RateLimiter()
            await limiter.check_tool_rate_limit(redis_client, self.name, user_id)

        # 3. Call Serper API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://google.serper.dev/search",
                json={"q": input, "num": 5},
                headers={
                    "X-API-KEY": settings.SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )

        if response.status_code != 200:
            return json.dumps(
                {"error": f"Search failed with status code {response.status_code}"}
            )

        results = response.json().get("organic", [])[:5]
        mapped = [
            {
                "title": r.get("title", ""),
                "url": r.get("link", ""),
                "snippet": r.get("snippet", ""),
            }
            for r in results
        ]
        return json.dumps(mapped)
