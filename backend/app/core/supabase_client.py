# STUB-FILL — Implemented by: workstream/1a-backend-core
from supabase import create_client, Client
from backend.app.core.config import settings


def get_supabase_client(token: str) -> Client:
    """Instantiate authenticated client connection scoped with Firebase JWT."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Inject Firebase Bearer Token directly into request headers to align with RLS policies
    client.postgrest.auth(token)
    return client
