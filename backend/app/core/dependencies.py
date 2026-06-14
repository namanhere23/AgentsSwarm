# STUB-FILL — Implemented by: workstream/1a-backend-core
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.core.security import verify_firebase_token
from backend.app.core.supabase_client import get_supabase_client
from fastapi.concurrency import run_in_threadpool

security = HTTPBearer()

async def get_current_user(request: Request, auth: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Auth dependency extracting JWT credentials and storing them in request context."""
    token = auth.credentials
    
    if token.startswith("nx-sk-"):
        # Verify API Key
        db_client = get_supabase_client()
        try:
            response = db_client.table("api_keys").select("user_id").eq("api_key", token).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error verifying API Key: {str(e)}")
            
        if not response.data:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        uid = response.data[0]["user_id"]
    else:
        # Verify Firebase JWT
        uid = await verify_firebase_token(token)

    # Auto-upsert dummy user to satisfy Foreign Key constraints
    try:
        db_client = get_supabase_client()
        await run_in_threadpool(
            lambda: db_client.table("users").upsert({"id": uid}).execute()
        )
    except Exception:
        # Safely ignore if user already exists or fails
        pass

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

