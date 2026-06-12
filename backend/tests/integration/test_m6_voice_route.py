from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, ANY
from backend.main import app

client = TestClient(app)


def test_post_swarms_voice_enqueues_stt_stream():
    headers = {"Authorization": "Bearer test_user"}

    # Mock file upload
    file_data = b"dummy audio file content"
    files = {"audio": ("test.wav", file_data, "audio/wav")}

    with patch(
        "backend.app.api.routes.swarms_voice.EventBus.publish", new_callable=AsyncMock
    ) as mock_pub:
        response = client.post("/swarms/voice", files=files, headers=headers)
        assert response.status_code == 202
        assert response.json()["status"] == "transcribing"

        # Verify stream publish enqueued
        mock_pub.assert_called_with(
            "stt_queue",
            {"audio_path": ANY, "user_id": "test_user", "crew_id": "research-crew"},
        )
