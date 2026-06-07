# STUB-FILL — Implemented by: workstream/2a-memory-system
from typing import List, Dict
from supabase import Client


class KnowledgeGraph:
    async def upsert_node(
        self, client: Client, entity_type: str, label: str, swarm_run_id: str
    ) -> str:
        """Create node or return existing node UUID."""
        # Check if exists
        response = (
            client.table("memory_graph_nodes")
            .select("id")
            .eq("label", label)
            .eq("entity_type", entity_type)
            .execute()
        )
        if response.data:
            return response.data[0]["id"]

        # Create new node
        insert_res = (
            client.table("memory_graph_nodes")
            .insert(
                {
                    "entity_type": entity_type,
                    "label": label,
                    "swarm_run_id": swarm_run_id,
                }
            )
            .execute()
        )
        return insert_res.data[0]["id"] if insert_res.data else ""

    async def upsert_edge(
        self,
        client: Client,
        source_id: str,
        target_id: str,
        relationship_type: str,
        weight: int = 1,
    ) -> None:
        """Upsert relational weight edge between two nodes."""
        # Unique directional edge checks
        response = (
            client.table("memory_graph_edges")
            .select("id, weight")
            .eq("source_node_id", source_id)
            .eq("target_node_id", target_id)
            .eq("relationship_type", relationship_type)
            .execute()
        )

        if response.data:
            edge_id = response.data[0]["id"]
            new_weight = response.data[0]["weight"] + weight
            client.table("memory_graph_edges").update({"weight": new_weight}).eq(
                "id", edge_id
            ).execute()
        else:
            client.table("memory_graph_edges").insert(
                {
                    "source_node_id": source_id,
                    "target_node_id": target_id,
                    "relationship_type": relationship_type,
                    "weight": weight,
                }
            ).execute()

    async def get_node_degree(self, client: Client, node_id: str) -> int:
        """Count the degree (number of connections) for a node."""
        response = (
            client.table("memory_graph_edges")
            .select("id")
            .or_(f"source_node_id.eq.{node_id},target_node_id.eq.{node_id}")
            .execute()
        )
        return len(response.data) if response.data else 0

    async def path_query(
        self, client: Client, start_label: str, max_degrees: int = 2
    ) -> List[Dict]:
        """Perform PostgreSQL recursive path query."""
        sql = f"""
        WITH RECURSIVE graph_path AS (
            SELECT id, label, entity_type, 0 as depth, ARRAY[id] as visited
            FROM memory_graph_nodes
            WHERE label = '{start_label}'
            UNION ALL
            SELECT n.id, n.label, n.entity_type, gp.depth + 1, gp.visited || n.id
            FROM memory_graph_nodes n
            JOIN memory_graph_edges e ON (e.source_node_id = gp.id OR e.target_node_id = gp.id)
            JOIN graph_path gp ON (n.id = e.target_node_id OR n.id = e.source_node_id)
            WHERE gp.depth < {max_degrees} AND NOT (n.id = ANY(gp.visited))
        )
        SELECT DISTINCT label, entity_type, depth FROM graph_path;
        """
        response = client.postgrest.rpc("raw_sql", {"query": sql}).execute()
        return response.data if response.data else []
