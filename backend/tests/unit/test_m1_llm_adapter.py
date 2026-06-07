import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.app.services.llm_adapter import LLMAdapter


@pytest.mark.asyncio
async def test_gemini_429_triggers_groq_failover():
    adapter = LLMAdapter(model="gemini-1.5-flash")

    # Mock Gemini fail with 429 status code
    mock_response_429 = AsyncMock()
    mock_response_429.chat.completions.create.side_effect = Exception(
        "Rate limit exceeded"
    )

    mock_response_success = AsyncMock()
    mock_choices = [MagicMock()]
    mock_choices[0].message.content = "Groq backup response success text"
    mock_response_success.chat.completions.create.return_value.choices = mock_choices
    mock_response_success.chat.completions.create.return_value.usage = None

    adapter.clients["gemini"] = mock_response_429
    adapter.clients["groq"] = mock_response_success

    res = await adapter.complete(
        [{"role": "user", "content": "test message"}], trace_id="1111"
    )
    assert res == "Groq backup response success text"
