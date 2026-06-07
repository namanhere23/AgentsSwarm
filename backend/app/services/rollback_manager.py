# STUB-FILL — Implemented by: workstream/5b-crew-manager-rollback
from backend.app.memory.repository import SupabaseRepository


class RollbackManager:
    """Compiles inverse operations to revert mutations executed by tools."""

    def __init__(self, db_client):
        self.db = db_client
        self.repo = SupabaseRepository()

    async def create_rollback_action(
        self,
        audit_log_id: str,
        tool_name: str,
        input_payload: dict,
        output_payload: dict,
    ) -> None:
        """Calculates inverse payload patterns and registers to rollback_actions."""
        inverse_payload = {}

        if tool_name == "HttpActionTool":
            method = input_payload.get("method", "GET")
            url = input_payload.get("url", "")

            # Revert POST by executing DELETE
            if method == "POST":
                created_id = output_payload.get("body", {}).get("id")
                if created_id:
                    inverse_payload = {
                        "method": "DELETE",
                        "url": f"{url}/{created_id}",
                        "headers": input_payload.get("headers", {}),
                        "body": {},
                    }
            # Revert DELETE by POSTing the original entity values
            elif method == "DELETE":
                inverse_payload = {
                    "method": "POST",
                    "url": url,
                    "headers": input_payload.get("headers", {}),
                    "body": output_payload.get(
                        "body", {}
                    ),  # Restores original body values
                }
            # Revert PUT by restoring the original state
            elif method == "PUT":
                inverse_payload = {
                    "method": "PUT",
                    "url": url,
                    "headers": input_payload.get("headers", {}),
                    "body": input_payload.get("original_body", {}),
                }

        # Register rollback mapping
        if inverse_payload:
            await self.db.table("rollback_actions").insert(
                {"audit_log_id": audit_log_id, "inverse_payload": inverse_payload}
            ).execute()
