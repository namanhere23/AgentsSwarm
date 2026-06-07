import pytest
import psycopg2
from backend.app.core.config import settings


@pytest.fixture
def db_conn():
    # settings.SUPABASE_URL might be a URL or standard postgres connection string.
    # psycopg2 needs a correct dsn. If settings.SUPABASE_URL is just a URI, it's fine.
    try:
        conn = psycopg2.connect(settings.SUPABASE_URL)
        yield conn
        conn.close()
    except (psycopg2.OperationalError, psycopg2.ProgrammingError) as e:
        pytest.skip(f"Database not available or invalid DSN: {e}")


def test_audit_log_insert_only(db_conn):
    cur = db_conn.cursor()

    # 1. Test Insert
    cur.execute(
        "INSERT INTO audit_log (approval_request_id, tool_name, input_payload) VALUES (%s, %s, %s) RETURNING id;",
        (
            "00000000-0000-0000-0000-000000000000",
            "HttpActionTool",
            '{"url": "https://example.com"}',
        ),
    )
    row_id = cur.fetchone()[0]
    db_conn.commit()
    assert row_id is not None

    # 2. Test Update (Expect RLS violation or standard permission denial)
    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cur.execute(
            "UPDATE audit_log SET tool_name = 'WebSearchTool' WHERE id = %s;", (row_id,)
        )
        db_conn.commit()

    db_conn.rollback()

    # 3. Test Delete
    with pytest.raises(psycopg2.errors.InsufficientPrivilege):
        cur.execute("DELETE FROM audit_log WHERE id = %s;", (row_id,))
        db_conn.commit()

    db_conn.rollback()
    cur.close()
