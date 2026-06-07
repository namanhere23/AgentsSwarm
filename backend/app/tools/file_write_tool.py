# STUB-FILL — Implemented by: workstream/4a-approval-gate
import os
import json
from pathlib import Path
from backend.app.tools.base import SwarmTool
from backend.app.core.config import settings


class FileWriteTool(SwarmTool):
    name = "FileWriteTool"
    description = (
        "Writes content to files within the sandboxed workspace/ directory. "
        "Input: JSON string: {filename: str, content: str}. Max 10MB per write."
    )

    async def _run(self, input: str) -> str:
        if os.getenv("MOCK_TOOLS", "false").lower() == "true":
            return json.dumps({"status": "written", "path": "workspace/mock_file.txt"})

        try:
            data = json.loads(input)
            filename = data["filename"]
            content = data["content"]
        except Exception:
            return json.dumps({"error": "Invalid JSON parameters"})

        # 1. Path traversal sandbox escape checks
        workspace_root = Path(settings.WORKSPACE_DIR).resolve()
        target_path = (workspace_root / filename).resolve()

        if not str(target_path).startswith(str(workspace_root)):
            return json.dumps(
                {
                    "error": "Security check failed: Path traversal escape attempt rejected."
                }
            )

        # 2. File size limitation check
        if len(content.encode("utf-8")) > 10 * 1024 * 1024:
            return json.dumps(
                {"error": "Security limit failed: Content size exceeds 10MB limit."}
            )

        # 3. Write output
        os.makedirs(target_path.parent, exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)

        return json.dumps(
            {"status": "written", "path": str(target_path.relative_to(workspace_root))}
        )
