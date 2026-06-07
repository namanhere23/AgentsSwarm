# STUB — Implemented by: workstream/5c-code-exec-tool
from backend.app.tools.base import SwarmTool


class CodeExecutionTool(SwarmTool):
    name = "CodeExecutionTool"
    description = "Runs Python code safely in isolated subprocess."

    async def _run(self, input: str) -> str:
        raise NotImplementedError()
