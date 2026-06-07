# STUB-FILL — Implemented by: workstream/1a-backend-core
# pyrefly: ignore [missing-import]
from supabase import create_client, Client
from backend.app.core.config import settings


def get_supabase_client(token: str) -> Client:
    """Instantiate authenticated client connection scoped with Firebase JWT."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # We do NOT inject the Firebase token here because PostgREST requires a Supabase JWT.
    # The backend acts as a trusted client using the Service Role Key, 
    # and enforces user isolation manually via .eq("user_id", user_id) in the API routes.
    return client
