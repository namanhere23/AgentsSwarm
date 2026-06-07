# STUB-FILL — Implemented by: workstream/1a-backend-core
from fastapi import Request, HTTPException
from backend.app.core.security import verify_firebase_token


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

    # Store user_id on request state for access in route handlers
    request.state.user_id = uid
    return uid
