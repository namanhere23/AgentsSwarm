from fastapi import APIRouter, Depends, HTTPException
from backend.app.core.dependencies import get_current_user, get_db_client
import uuid
from typing import Dict, List

router = APIRouter()

@router.post("/api-keys")
async def generate_api_key(
    name: str = "Default Key", 
    user_id: str = Depends(get_current_user),
    db_client = Depends(get_db_client)
) -> Dict[str, str]:
    """Generates a new API key for the authenticated user and stores it in Supabase."""
    
    # Generate a unique API key with a prefix for easy identification
    raw_key = uuid.uuid4().hex
    api_key = f"nx-sk-{raw_key}"
    
    # Insert into database
    response = db_client.table("api_keys").insert({
        "user_id": user_id,
        "api_key": api_key,
        "name": name
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to store API key in database.")
        
    return {"api_key": api_key, "name": name, "created_at": response.data[0]["created_at"]}

@router.get("/api-keys")
async def list_api_keys(
    user_id: str = Depends(get_current_user),
    db_client = Depends(get_db_client)
) -> List[Dict]:
    """Lists all active API keys for the user."""
    
    response = db_client.table("api_keys").select("id, name, created_at, api_key").eq("user_id", user_id).execute()
    
    # Only return the last 4 characters of the key for security, except the full key is shown only once on creation
    keys = []
    for row in response.data:
        masked_key = f"nx-sk-...{row['api_key'][-4:]}"
        keys.append({
            "id": row["id"],
            "name": row["name"],
            "created_at": row["created_at"],
            "masked_key": masked_key
        })
        
    return keys
