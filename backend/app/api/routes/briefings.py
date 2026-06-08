# Implemented by: workstream/7-integration
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from backend.app.core.dependencies import get_current_user
from backend.app.core.config import settings

router = APIRouter(prefix="/workspace", tags=["briefings"])


@router.get("/{filename}")
async def get_workspace_file(filename: str, user_id: str = Depends(get_current_user)):
    """Serves compiled WAV, Markdown, or PDF assets from workspace sandboxes."""
    workspace_root = Path(settings.WORKSPACE_DIR).resolve()
    target_path = (workspace_root / filename).resolve()

    # Path Traversal Check
    if not str(target_path).startswith(str(workspace_root)):
        raise HTTPException(
            status_code=403, detail="Access denied: path traversal rejected."
        )

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Requested asset file not found.")

    # Determine Content-Type header
    ext = target_path.suffix.lower()
    media_types = {
        ".wav": "audio/wav",
        ".md": "text/markdown",
        ".pdf": "application/pdf",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(target_path, media_type=media_type, filename=filename)
