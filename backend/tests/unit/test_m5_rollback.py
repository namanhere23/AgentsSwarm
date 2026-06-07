import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.app.services.rollback_manager import RollbackManager


@pytest.mark.asyncio
async def test_rollback_compiles_correct_http_delete_inverse():
    db_mock = MagicMock()
    db_mock.table.return_value.insert.return_value.execute = AsyncMock()

    manager = RollbackManager(db_mock)

    input_payload = {
        "method": "POST",
        "url": "https://api.com/users",
        "headers": {},
        "body": {},
    }
    output_payload = {"status": 201, "body": {"id": "user_777"}}

    await manager.create_rollback_action(
        audit_log_id="audit_123",
        tool_name="HttpActionTool",
        input_payload=input_payload,
        output_payload=output_payload,
    )

    # Verify exact DELETE payload maps target id
    db_mock.table.assert_called_with("rollback_actions")
    insert_args = db_mock.table.return_value.insert.call_args[0][0]

    assert insert_args["audit_log_id"] == "audit_123"
    assert insert_args["inverse_payload"]["method"] == "DELETE"
    assert insert_args["inverse_payload"]["url"] == "https://api.com/users/user_777"
