# NEW — Implemented by: workstream/2b-llm-adapter-tools
import os
import json
from sentence_transformers import SentenceTransformer
from backend.app.tools.base import SwarmTool
from backend.app.memory.vector_store import VectorStore


class VectorSearchTool(SwarmTool):
    name = "VectorSearchTool"
    description = "Searches the vector store for semantic matches. Input: query string. Output: JSON array of matches."

    def __init__(self):
        super().__init__()
        self.vstore = VectorStore()
        # Initialize small sentence transformer for ad-hoc embedding generation
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    async def _run(self, input: str, user_id: str = None) -> str:
        if os.getenv("MOCK_TOOLS", "false").lower() == "true":
            return json.dumps(
                [
                    {
                        "memory_event_id": "00000000",
                        "content": "Mock vector text match",
                        "score": 0.9,
                    }
                ]
            )

        if not user_id:
            return json.dumps({"error": "user_id context missing for vector search"})

        # Embed query text
        query_vector = self.model.encode(input).tolist()
        results = self.vstore.query_memory(user_id, query_vector, n_results=50)
        return json.dumps(results)
