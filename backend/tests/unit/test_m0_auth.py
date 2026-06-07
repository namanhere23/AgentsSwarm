import pytest
from unittest.mock import patch
from fastapi import HTTPException
from backend.app.core.security import verify_firebase_token
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_verify_firebase_token_invalid_token_raises_401():
    with patch("firebase_admin.auth.verify_id_token") as mock_verify:
        # Inject standard Firebase Admin auth failure
        mock_verify.side_effect = ValueError("Invalid signature")

        with patch.object(settings, "ENVIRONMENT", "production"):
            with pytest.raises(HTTPException) as exc_info:
                await verify_firebase_token("bad_token")
            assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_verify_firebase_token_bypass_in_development():
    with patch.object(settings, "ENVIRONMENT", "development"):
        uid = await verify_firebase_token("my_dev_uid")
        assert uid == "my_dev_uid"


@pytest.mark.asyncio
async def test_circuit_breaker_trips_on_third_failure():
    from unittest.mock import AsyncMock

    redis_mock = AsyncMock()
    # Mocking incremental counter calls
    redis_mock.hincrby.return_value = 3
    redis_mock.hget.return_value = b"open"

    from backend.app.core.circuit_breaker import (
        record_failure,
        check_breaker,
        CircuitBreakerOpen,
    )

    await record_failure(redis_mock, "gemini")

    with pytest.raises(CircuitBreakerOpen):
        await check_breaker(redis_mock, "gemini")
