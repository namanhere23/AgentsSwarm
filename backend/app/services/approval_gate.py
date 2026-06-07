# STUB — Implemented by: workstream/4a-approval-gate
from backend.app.models.approval_models import ApprovalResult


class ApprovalGate:
    async def create_approval_request(
        self,
        tool_name: str,
        proposed_payload: dict,
        risk_level: str,
        swarm_run_id: str,
        user_id: str,
    ) -> str:
        raise NotImplementedError()

    async def wait_for_approval(self, approval_request_id: str) -> ApprovalResult:
        raise NotImplementedError()

    async def approve(self, approval_request_id: str) -> None:
        raise NotImplementedError()

    async def reject(self, approval_request_id: str, reason: str | None) -> None:
        raise NotImplementedError()
