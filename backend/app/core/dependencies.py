# STUB-FILL — Implemented by: workstream/1a-backend-core
from fastapi import Request, HTTPException
from backend.app.core.security import verify_firebase_token
from backend.app.core.supabase_client import get_supabase_client


async def get_current_user(request: Request) -> str:
    """Auth dependency extracting JWT credentials and storing them in request context."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Authorization scheme must be Bearer"
        )

    token = auth_header.split(" ")[1]
    uid = await verify_firebase_token(token)

    # Store both user_id and token on request state for downstream use
    request.state.user_id = uid
    request.state.token = token
    return uid


async def get_db_client(request: Request):
    """
    Dependency that returns a Supabase client scoped with the verified Bearer token.
    Must be used after get_current_user has run (e.g. as a second Depends).
    Uses token stored on request.state by get_current_user.
    """
    token = getattr(request.state, "token", None)
    if not token:
        raise HTTPException(status_code=401, detail="No authenticated token on request state.")
    return get_supabase_client(token)

