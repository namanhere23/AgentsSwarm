import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.services.action_executor import ActionExecutor


@pytest.mark.asyncio
async def test_action_executor_logs_correctly_on_success():
    db_mock = MagicMock()
    # Mock return insertions
    db_mock.table.return_value.update.return_value.eq.return_value.execute = AsyncMock()

    with patch(
        "backend.app.services.action_executor.SupabaseRepository"
    ) as mock_repo_class:
        mock_repo = mock_repo_class.return_value
        mock_repo.insert_audit_log = AsyncMock(return_value={"id": "audit_id_77"})

        executor = ActionExecutor(db_mock)
        res = await executor.log_action_execution(
            approval_request_id="req_99",
            tool_name="HttpActionTool",
            input_payload={"url": "https://api.com"},
            output_payload={"status": 200},
            duration_ms=150,
        )

        assert res["id"] == "audit_id_77"
        # Confirm status updated to executed
        db_mock.table.assert_any_call("approval_requests")
