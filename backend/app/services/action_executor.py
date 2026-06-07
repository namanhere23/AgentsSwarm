# STUB-FILL — Implemented by: workstream/4b-audit-executor
from typing import Dict, Any
from backend.app.memory.repository import SupabaseRepository


class ActionExecutor:
    """
    Manages final action dispatch metrics.
    Only this class executes writes to the immutable 'audit_log' table.
    """

    def __init__(self, db_client):
        self.db = db_client
        self.repo = SupabaseRepository()

    async def log_action_execution(
        self,
        approval_request_id: str,
        tool_name: str,
        input_payload: Dict[str, Any],
        output_payload: Dict[str, Any],
        duration_ms: int,
    ) -> Dict[str, Any]:
        """Writes immutable log audit entry to Postgres, marking request as executed."""
        # 1. Update approval request state status
        await self.db.table("approval_requests").update({"status": "executed"}).eq(
            "id", approval_request_id
        ).execute()

        # 2. Write to immutable log structure (INSERT-only)
        audit_data = {
            "approval_request_id": approval_request_id,
            "tool_name": tool_name,
            "input_payload": input_payload,
            "output_payload": output_payload,
            "duration_ms": duration_ms,
        }

        audit_record = await self.repo.insert_audit_log(self.db, audit_data)

        # Extension point for rollback log tracking (Phase 5B) goes here

        return audit_record

    async def log_action_failure(
        self, approval_request_id: str, error_message: str
    ) -> None:
        """Flags approval request status as failed."""
        await self.db.table("approval_requests").update(
            {"status": "failed", "rejection_reason": error_message}
        ).eq("id", approval_request_id).execute()
