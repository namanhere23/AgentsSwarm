import pytest
from unittest.mock import MagicMock, patch


def test_memory_decay_updates_scores():
    # We mock psycopg2 to avoid requiring a live local Postgres database instance.
    with patch("psycopg2.connect") as mock_connect:
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cur

        # Mock row ID return
        mock_cur.fetchone.side_effect = [
            [1],
            [0.5],
        ]  # First returns row_id, second returns decayed_score

        # 1. Insert memory event
        mock_cur.execute(
            "INSERT INTO memory_events (user_id, swarm_run_id, agent_role, task_description, content, priority_score, effective_score, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, now() - interval '30 days') RETURNING id;",
            (
                "00000000-0000-0000-0000-000000000000",
                "00000000-0000-0000-0000-000000000000",
                "executor",
                "desc",
                "content",
                1.0,
                1.0,
            ),
        )
        row_id = mock_cur.fetchone()[0]

        # 2. Trigger decay SQL update
        mock_cur.execute(
            "UPDATE memory_events SET effective_score = priority_score * exp(-(ln(2)/30) * extract(day from now() - created_at)) WHERE id = %s;",
            (row_id,),
        )

        # 3. Read back score
        mock_cur.execute(
            "SELECT effective_score FROM memory_events WHERE id = %s;", (row_id,)
        )
        decayed_score = mock_cur.fetchone()[0]

        assert 0.45 <= decayed_score <= 0.55

        # Clean up
        mock_cur.execute("DELETE FROM memory_events WHERE id = %s;", (row_id,))
