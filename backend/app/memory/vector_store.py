import os
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction


class VectorStore:
    def __init__(self):
        from backend.app.core.config import settings
        
        # Connect to standalone ChromaDB server (essential for multi-worker/Render deployment)
        self.client = chromadb.HttpClient(
            host=settings.CHROMA_HOST, 
            port=settings.CHROMA_PORT,
            ssl=("onrender.com" in settings.CHROMA_HOST or settings.CHROMA_PORT == 443)
        )
        self.embedding_fn = SentenceTransformerEmbeddingFunction(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    def get_or_create_collection(self):
        return self.client.get_or_create_collection(
            name="swarm_memory",
            metadata={"hnsw:space": "cosine"},
            embedding_function=self.embedding_fn,
        )

    def upsert_memory(self, memory_event_id: str, content: str, metadata: dict) -> None:
        collection = self.get_or_create_collection()
        collection.upsert(
            ids=[memory_event_id], documents=[content], metadatas=[metadata]
        )

    def query_memory(
        self, user_id: str, query_embedding: list[float], n_results: int = 50
    ) -> list[dict]:
        collection = self.get_or_create_collection()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where={"user_id": user_id},
        )

        # Flatten query returns
        flattened = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            ids = results["ids"][0]
            metas = results["metadatas"][0]
            distances = (
                results["distances"][0] if "distances" in results else [0.0] * len(docs)
            )
            for i in range(len(docs)):
                flattened.append(
                    {
                        "memory_event_id": ids[i],
                        "content": docs[i],
                        "metadata": metas[i],
                        "score": 1.0 - distances[i],  # Convert distance to similarity
                    }
                )
        return flattened


# Module-level convenience used by memory.repository
def upsert_memory(memory_event_id: str, content: str, metadata: dict) -> None:
    store = VectorStore()
    return store.upsert_memory(memory_event_id, content, metadata)
