# STUB — Implemented by: workstream/4a-approval-gate
from backend.app.tools.base import SwarmTool


class HttpActionTool(SwarmTool):
    name = "HttpActionTool"
    description = "Dispatches HTTP requests to external APIs with approval gating."

    async def _run(self, input: str) -> str:
        raise NotImplementedError()
