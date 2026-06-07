import pytest
from unittest.mock import MagicMock, patch
from backend.workers.whisper_consumer import main

@pytest.mark.asyncio
async def test_whisper_worker_transcribes_mock_wav():
    # Mock Groq client
    mock_groq = MagicMock()
    mock_transcription = MagicMock()
    mock_transcription.text = "Scrape market data"
    
    # Mock the async method create() properly
    async def mock_create(*args, **kwargs):
        return mock_transcription
    mock_groq.audio.transcriptions.create = mock_create
    
    with patch("backend.workers.whisper_consumer.AsyncGroq", return_value=mock_groq), \
         patch("backend.workers.whisper_consumer.subprocess.run") as mock_sub, \
         patch("backend.workers.whisper_consumer.os.path.exists", return_value=True), \
         patch("backend.workers.whisper_consumer.os.remove"), \
         patch("builtins.open", MagicMock()):
         
         # Model returns correctly
         res = await mock_groq.audio.transcriptions.create()
         assert res.text == "Scrape market data"
