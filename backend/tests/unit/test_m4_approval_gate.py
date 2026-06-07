import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException
from backend.app.api.routes.approvals import approve_action


@pytest.mark.asyncio
async def test_approve_non_pending_record_returns_400():
    db_mock = MagicMock()
    # Mock return list showing already executed state status
    db_mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "req_id_111", "status": "executed", "swarm_run_id": "run_id_222"}
    ]

    with patch(
        "backend.app.api.routes.approvals.get_supabase_client", return_value=db_mock
    ), patch(
        "backend.app.api.routes.approvals.approval_gate.approve", new_callable=AsyncMock
    ):

        with pytest.raises(HTTPException) as exc:
            await approve_action(
                "req_id_111", user_id="user_12", redis_client=MagicMock()
            )
        assert exc.value.status_code == 400
        assert "not in pending state" in exc.value.detail
