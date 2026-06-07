import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from backend.main import app
from croniter import croniter

client = TestClient(app)


def test_create_schedule_invalid_cron_returns_400():
    headers = {"Authorization": "Bearer test_user"}

    # Mock crew check to pass
    with patch("backend.app.api.routes.schedules.get_crew", return_value=True):
        response = client.post(
            "/swarms/schedule",
            json={
                "crew_id": "research-crew",
                "objective": "test objective",
                "cron_expression": "invalid_expression_here",
                "timezone": "UTC",
            },
            headers=headers,
        )

        assert response.status_code == 400
        assert "Invalid cron expression" in response.json()["detail"]


def test_croniter_validation():
    assert croniter.is_valid("0 0 * * *")
    assert not croniter.is_valid("invalid")
