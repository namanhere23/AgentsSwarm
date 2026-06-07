# STUB-FILL — Implemented by: workstream/3a-crew-execution-engine
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
from backend.app.core.config import settings



class PostgresCheckpointer:
    def __init__(self):
        # Configure psycopg ConnectionPool with autocommit=True and dict_row row factory
        self.pool = ConnectionPool(
            conninfo=settings.SUPABASE_URL,
            open=True,
            kwargs={"autocommit": True, "row_factory": dict_row},
        )

    def setup(self):
        """Creates checkpoints table on startup."""
        with self.pool.connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS checkpoints (
                    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
                    thread_id VARCHAR NOT NULL,
                    checkpoint_data BYTEA NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
            """
            )

    def get_saver(self):
        # Wraps database pool as custom checkpoint saver class for CrewAI structures
        return self
