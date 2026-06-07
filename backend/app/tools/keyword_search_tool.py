# NEW — Implemented by: workstream/2b-llm-adapter-tools
import os
import json
from backend.app.tools.base import SwarmTool
from backend.app.memory.repository import SupabaseRepository
from backend.app.core.supabase_client import get_supabase_client


class KeywordSearchTool(SwarmTool):
    name = "KeywordSearchTool"
    description = "Performs Postgres full-text indexing searches. Input: search query terms. Output: JSON array of hits."

    async def _run(self, input: str, user_id: str = None, token: str = None) -> str:
        if os.getenv("MOCK_TOOLS", "false").lower() == "true":
            return json.dumps(
                [{"id": "00000", "content": "Mock keyword matched event metadata"}]
            )

        if not user_id or not token:
            return json.dumps(
                {"error": "Auth headers context missing for database search"}
            )

        # Instantiate repository scoped connection
        db = get_supabase_client(token)
        repo = SupabaseRepository()

        results = await repo.search_memory_keyword(db, user_id, input, limit=50)
        return json.dumps(results)
