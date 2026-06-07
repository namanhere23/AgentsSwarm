import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.api.routes.memory import search_memory


@pytest.mark.asyncio
async def test_memory_search_entity_overlap_boosting():
    # Mock Chroma results
    vector_mock = [
        {
            "memory_event_id": "event_11",
            "content": "Alice project plan summary",
            "score": 0.8,
            "metadata": {
                "swarm_run_id": "run_0",
                "agent_role": "orchestrator",
                "effective_score": 0.9,
                "created_at": "now",
            },
        },
        {
            "memory_event_id": "event_22",
            "content": "Random server stats logs",
            "score": 0.75,
            "metadata": {
                "swarm_run_id": "run_1",
                "agent_role": "executor",
                "effective_score": 0.8,
                "created_at": "now",
            },
        },
    ]

    db_mock = MagicMock()
    # Mock text search returns and entity relations fetches
    db_mock.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"memory_event_id": "event_11", "entity_text": "Alice"}
    ]

    with patch(
        "backend.app.api.routes.memory.get_supabase_client", return_value=db_mock
    ), patch(
        "backend.app.api.routes.memory.vstore.query_memory", return_value=vector_mock
    ), patch(
        "backend.app.api.routes.memory.SupabaseRepository.search_memory_keyword",
        new_callable=AsyncMock,
    ) as mock_keyword, patch(
        "backend.app.api.routes.memory.extract_entities",
        return_value=[{"entity_type": "PERSON", "entity_text": "Alice"}],
    ):

        mock_keyword.return_value = (
            []
        )  # Keyword empty to isolate vector + entity boosts

        res = await search_memory(q="Alice", user_id="user_1")

        # Assert first element in array is event_11 due to Alice entity overlap boost
        assert res.results[0].memory_event_id == "event_11"
