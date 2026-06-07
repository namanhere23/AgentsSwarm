# STUB-FILL — Implemented by: workstream/2a-memory-system
from typing import Optional, List
from supabase import Client


class SupabaseRepository:
    """The single centralized data repository layer interfacing with Supabase PostgreSQL."""

    async def insert_swarm_run(self, client: Client, data: dict) -> dict:
        response = client.table("swarm_runs").insert(data).execute()
        return response.data[0] if response.data else {}

    async def update_swarm_run_status(
        self,
        client: Client,
        run_id: str,
        status: str,
        output_summary: Optional[str] = None,
    ) -> dict:
        update_data = {"status": status}
        if output_summary is not None:
            update_data["output_summary"] = output_summary
            from datetime import datetime

            update_data["completed_at"] = datetime.utcnow().isoformat()
        response = (
            client.table("swarm_runs").update(update_data).eq("id", run_id).execute()
        )
        return response.data[0] if response.data else {}

    async def get_swarm_run(self, client: Client, run_id: str) -> Optional[dict]:
        response = client.table("swarm_runs").select("*").eq("id", run_id).execute()
        return response.data[0] if response.data else None

    async def insert_memory_event(self, client: Client, data: dict) -> dict:
        response = client.table("memory_events").insert(data).execute()
        return response.data[0] if response.data else {}

    async def insert_memory_entity(self, client: Client, data: dict) -> dict:
        response = client.table("memory_entities").insert(data).execute()
        return response.data[0] if response.data else {}

    async def search_memory_keyword(
        self, client: Client, user_id: str, query: str, limit: int = 50
    ) -> List[dict]:
        # Perform tsvector keyword rank query using supabase rpc or standard query
        response = (
            client.table("memory_events")
            .select("*, content_tsv")
            .eq("user_id", user_id)
            .text_search("content_tsv", query)
            .limit(limit)
            .execute()
        )
        return response.data

    async def insert_audit_log(self, client: Client, data: dict) -> dict:
        response = client.table("audit_log").insert(data).execute()
        return response.data[0] if response.data else {}

    async def insert_approval_request(self, client: Client, data: dict) -> dict:
        response = client.table("approval_requests").insert(data).execute()
        return response.data[0] if response.data else {}

    async def update_approval_request(
        self,
        client: Client,
        request_id: str,
        status: str,
        rejection_reason: Optional[str] = None,
    ) -> dict:
        update_data = {"status": status}
        if rejection_reason:
            update_data["rejection_reason"] = rejection_reason
        response = (
            client.table("approval_requests")
            .update(update_data)
            .eq("id", request_id)
            .execute()
        )
        return response.data[0] if response.data else {}


# Module-level convenience wrappers used by crew_executor
_repo = SupabaseRepository()


async def insert_swarm_run(client: Client, data: dict) -> dict:
    return await _repo.insert_swarm_run(client, data)


async def upsert_memory(client: Client, data: dict) -> dict:
    return await _repo.insert_memory_event(client, data)
