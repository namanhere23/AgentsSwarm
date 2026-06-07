# STUB-FILL — Implemented by: workstream/1a-backend-core
from firebase_admin import auth
from fastapi import HTTPException
from backend.app.core.config import settings


async def verify_firebase_token(token: str) -> str:
    """Decode and verify OAuth Firebase JWT. Returns the uid string."""
    if settings.ENVIRONMENT == "development":
        # In development, extract the real UID by decoding the JWT payload locally.
        # This bypasses cryptographic signature verification (which requires a Google
        # Service Account JSON that isn't present locally) but correctly maps the user.
        if len(token) > 100:
            import base64
            import json
            try:
                payload_b64 = token.split('.')[1]
                payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
                payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode('utf-8'))
                uid = payload.get("user_id") or payload.get("sub") or payload.get("uid")
                if uid:
                    return uid
            except Exception:
                pass
        return token

    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(
                status_code=401, detail="Invalid token: missing uid claim"
            )
        return uid
    except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError) as e:
        import traceback
        with open("auth_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(
            status_code=401, detail=f"Invalid or expired token: {str(e)}"
        )
    except Exception as e:
        import traceback
        with open("auth_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
