# STUB-FILL — Implemented by: workstream/1a-backend-core
from supabase import create_client, Client
from backend.app.core.config import settings


def get_supabase_client(token: str = None) -> Client:
    """Instantiate authenticated client connection using the Service Role Key.
    We do NOT inject the Firebase JWT into PostgREST because Supabase will
    reject it (PGRST301) as it is signed by Google, not Supabase. The backend
    is trusted and bypasses RLS using the Service Key."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return client
