import os
import pytest

# Set required env vars before any backend imports to prevent sys.exit(1)
_env_patch = {
    "SECRET_KEY": "test-secret-key",
    "FIREBASE_PROJECT_ID": "test-project",
    "SUPABASE_JWT_SECRET": "test-jwt-secret",
    "SUPABASE_URL": "http://localhost:54321",
    "SUPABASE_SERVICE_KEY": "test-service-key",
    "GEMINI_API_KEY": "test-gemini-key",
    "SERPER_API_KEY": "test-serper-key",
}
for k, v in _env_patch.items():
    os.environ.setdefault(k, v)

from fastapi.testclient import TestClient  # noqa: E402
from backend.main import app  # noqa: E402
from backend.app.core.crew_registry import _registry  # noqa: E402
from backend.app.models.crew_definition import CrewDefinition  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_crew():
    # Insert mock crew configuration in singleton registry memory
    mock_def = CrewDefinition(
        id="mock-research",
        name="Mock Research Crew",
        description="test crew desc",
        process="hierarchical",
        agents=[{"role": "orchestrator", "tools": []}],
    )
    _registry._crews = {"mock-research": mock_def}


def test_post_swarms_unregistered_crew_returns_404():
    headers = {"Authorization": "Bearer test_user"}
    response = client.post(
        "/swarms", json={"crew_id": "nonexistent", "objective": "test"}, headers=headers
    )
    assert response.status_code == 404


def test_post_swarms_invalid_priority_override_returns_422():
    headers = {"Authorization": "Bearer test_user"}
    response = client.post(
        "/swarms",
        json={
            "crew_id": "mock-research",
            "objective": "test",
            "priority_override": 2.5,
        },
        headers=headers,
    )
    assert response.status_code == 422
