# STUB-FILL — Implemented by: workstream/2a-memory-system
from supabase import Client


async def trigger_manual_decay(client: Client) -> int:
    """Executes the mathematical score decay query over all memory events."""
    sql = """
    UPDATE memory_events
    SET effective_score = priority_score * exp(-(ln(2)/30) * extract(day from now() - created_at))
    RETURNING id;
    """
    response = client.postgrest.rpc("raw_sql", {"query": sql}).execute()
    return len(response.data) if response.data else 0
