# STUB — Implemented by: workstream/4a-approval-gate
from backend.app.tools.base import SwarmTool


class FileWriteTool(SwarmTool):
    name = "FileWriteTool"
    description = "Writes file output into sandboxed workspace folder."

    async def _run(self, input: str) -> str:
        raise NotImplementedError()
