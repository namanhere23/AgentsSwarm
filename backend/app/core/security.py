# STUB-FILL — Implemented by: workstream/1a-backend-core
from firebase_admin import auth
from fastapi import HTTPException
from backend.app.core.config import settings


async def verify_firebase_token(token: str) -> str:
    """Decode and verify OAuth Firebase JWT. Returns the uid string."""
    if settings.ENVIRONMENT == "development":
        # Bypass signature verification in development for easy local testing
        if not token:
            raise HTTPException(
                status_code=401, detail="Invalid or empty token in development"
            )
        import uuid
        import hashlib
        try:
            # Check if token is already a valid UUID
            uuid_obj = uuid.UUID(token)
            return str(uuid_obj)
        except ValueError:
            # If not, generate a consistent UUID based on the dummy token string
            # This prevents Postgres 'invalid input syntax for type uuid' errors
            m = hashlib.md5()
            m.update(token.encode("utf-8"))
            return str(uuid.UUID(m.hexdigest()))

    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(
                status_code=401, detail="Invalid token: missing uid claim"
            )
        return uid
    except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError) as e:
        raise HTTPException(
            status_code=401, detail=f"Invalid or expired token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
