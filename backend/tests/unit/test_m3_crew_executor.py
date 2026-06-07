import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.services.crew_executor import execute_crew


@pytest.mark.asyncio
async def test_crew_executor_sets_failed_on_kickoff_exception():
    mock_crew = MagicMock()
    mock_crew.kickoff.side_effect = Exception("API connection timeout")
    # Mock routing setup dependencies
    with patch(
        "backend.app.services.crew_executor.get_supabase_client"
    ) as mock_db, patch(
        "backend.app.services.crew_executor.SupabaseRepository"
    ) as mock_repo_class, patch(
        "backend.app.services.crew_executor.Crew", return_value=mock_crew
    ):

        mock_repo = mock_repo_class.return_value
        mock_repo.update_swarm_run_status = AsyncMock()

        # Mock crew details
        crew_def = MagicMock()
        crew_def.agents = [
            MagicMock(),
            MagicMock(),
            MagicMock(),
            MagicMock(),
            MagicMock(),
        ]

        # Run execution trigger
        await execute_crew(
            "run_id_0000", crew_def, "Research AI trends", "user_id_1111", "token_2222"
        )

        # Confirm state changed to failed
        mock_repo.update_swarm_run_status.assert_any_call(
            mock_db.return_value, "run_id_0000", "failed"
        )
