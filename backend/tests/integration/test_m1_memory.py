import uuid
from backend.app.memory.vector_store import VectorStore


def test_chroma_uuid_mapping():
    vstore = VectorStore()
    event_id = str(uuid.uuid4())
    content = "The quick brown fox jumps over the lazy dog"
    metadata = {"user_id": "test_user"}

    # Upsert
    vstore.upsert_memory(event_id, content, metadata)

    # Query using query vector helper (or random mock vector)
    collection = vstore.get_or_create_collection()
    query_res = collection.get(ids=[event_id])

    assert query_res["ids"][0] == event_id
    assert query_res["documents"][0] == content
