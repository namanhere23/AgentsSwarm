from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from backend.app.models.memory_models import MemorySearchResponse, MemorySearchResult
from backend.app.core.dependencies import get_current_user, get_db_client
from backend.app.memory.vector_store import VectorStore
from backend.app.memory.repository import SupabaseRepository
from backend.app.memory.ner_pipeline import extract_entities

router = APIRouter(prefix="/memory", tags=["memory"])

# Load SentenceTransformer once at module load
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
vstore = VectorStore()


class MemoryEventRequest(BaseModel):
    """Validated input model for creating memory events — replaces raw dict."""
    swarm_run_id: str = Field(..., min_length=36, max_length=36)
    agent_role: str = Field(..., min_length=1, max_length=100)
    task_description: str = Field(default="N/A", max_length=500)
    content: str = Field(..., min_length=1, max_length=10000)


@router.get("/search", response_model=MemorySearchResponse)
async def search_memory(
    q: str = Query(...),
    user_id: str = Depends(get_current_user),
    db_client=Depends(get_db_client),
):
    """
    Executes a hybrid RAG search matching vector query embeddings, SQL rank keywords,
    and spaCy entity tags overlaps. Normalizes results and returns the top 10 items.
    """
    repo = SupabaseRepository()

    # 1. Fetch top-50 results from ChromaDB cosine similarity search
    query_vector = model.encode(q).tolist()
    vector_results = vstore.query_memory(user_id, query_vector, n_results=50)

    # 2. Fetch top-50 results from Postgres tsvector keyword search
    keyword_results = await repo.search_memory_keyword(db_client, user_id, q, limit=50)

    # Extract entities from query
    query_entities = {e["entity_text"].lower() for e in extract_entities(q)}

    # Map scores to memory event IDs
    all_events = {}

    # 3. Apply min-max normalization to vector results
    v_scores = [r["score"] for r in vector_results]
    v_min, v_max = min(v_scores) if v_scores else 0.0, (
        max(v_scores) if v_scores else 1.0
    )
    v_denom = (v_max - v_min) if (v_max - v_min) > 0 else 1.0

    for r in vector_results:
        eid = r["memory_event_id"]
        norm_v = (r["score"] - v_min) / v_denom

        # Hydrate document metadata
        meta = r["metadata"]
        all_events[eid] = {
            "memory_event_id": eid,
            "swarm_run_id": meta.get("swarm_run_id", ""),
            "agent_role": meta.get("agent_role", "executor"),
            "content": r["content"],
            "effective_score": meta.get("effective_score", 0.5),
            "vector_norm": norm_v,
            "keyword_norm": 0.0,
            "overlap_norm": 0.0,
            "created_at": meta.get("created_at", ""),
        }

    # 4. Apply min-max normalization to keyword results
    # postgres text_search returns items with a ts_rank value
    k_scores = [float(r.get("ts_rank", 0.0)) for r in keyword_results]
    k_min, k_max = min(k_scores) if k_scores else 0.0, (
        max(k_scores) if k_scores else 1.0
    )
    k_denom = (k_max - k_min) if (k_max - k_min) > 0 else 1.0

    for idx, r in enumerate(keyword_results):
        eid = r["id"]
        raw_k = float(r.get("ts_rank", 0.0))
        norm_k = (raw_k - k_min) / k_denom

        if eid in all_events:
            all_events[eid]["keyword_norm"] = norm_k
        else:
            # Query db for entities since Chroma was missed
            all_events[eid] = {
                "memory_event_id": eid,
                "swarm_run_id": r.get("swarm_run_id", ""),
                "agent_role": r.get("agent_role", "executor"),
                "content": r.get("content", ""),
                "effective_score": r.get("effective_score", 0.5),
                "vector_norm": 0.0,
                "keyword_norm": norm_k,
                "overlap_norm": 0.0,
                "created_at": r.get("created_at", ""),
            }

    # 5. Entity overlap tag calculation
    # Fetch entity overlap list for all referenced ids
    if all_events:
        eids_filter = list(all_events.keys())
        # Sync Supabase call → threadpool to avoid blocking async event loop
        ent_response = await run_in_threadpool(
            lambda: db_client.table("memory_entities")
            .select("memory_event_id, entity_text")
            .in_("memory_event_id", eids_filter)
            .execute()
        )

        # Map event entity lists
        event_entities = {}
        for ent in ent_response.data:
            me_id = ent["memory_event_id"]
            if me_id not in event_entities:
                event_entities[me_id] = set()
            event_entities[me_id].add(ent["entity_text"].lower())

        # Compute raw overlaps
        overlaps = {}
        for eid in all_events:
            event_set = event_entities.get(eid, set())
            common = event_set.intersection(query_entities)
            overlaps[eid] = len(common)

        # Normalize overlaps
        o_vals = list(overlaps.values())
        o_min, o_max = min(o_vals) if o_vals else 0, max(o_vals) if o_vals else 1
        o_denom = (o_max - o_min) if (o_max - o_min) > 0 else 1.0

        for eid in all_events:
            all_events[eid]["overlap_norm"] = (overlaps[eid] - o_min) / o_denom

    # 6. Apply RAG fusion formula:
    # final_score = (0.60 * vector_score) + (0.25 * keyword_score) + (0.15 * entity_overlap_score)
    scored_results = []
    for eid, ev in all_events.items():
        f_score = (
            (0.60 * ev["vector_norm"])
            + (0.25 * ev["keyword_norm"])
            + (0.15 * ev["overlap_norm"])
        )

        # Hydrate entity labels array for frontend presentation
        entity_labels = []
        if eid in event_entities:
            entity_labels = list(event_entities[eid])

        scored_results.append(
            (
                f_score,
                MemorySearchResult(
                    memory_event_id=eid,
                    swarm_run_id=ev["swarm_run_id"],
                    agent_role=ev["agent_role"],
                    content=ev["content"],
                    effective_score=ev["effective_score"],
                    entities=entity_labels,
                    created_at=str(ev["created_at"]),
                ),
            )
        )

    # Deduplicate and sort by final_score descending, return top-10
    scored_results.sort(key=lambda x: x[0], reverse=True)
    top_10 = [x[1] for x in scored_results[:10]]

    return MemorySearchResponse(results=top_10)


@router.post("/events", response_model=str)
async def create_memory_event(
    event: MemoryEventRequest,  # Pydantic model — validated, no KeyError risk
    user_id: str = Depends(get_current_user),
    db=Depends(get_db_client),
):
    repo = SupabaseRepository()
    record = await repo.insert_memory_event(
        db,
        {
            "user_id": user_id,
            "swarm_run_id": event.swarm_run_id,
            "agent_role": event.agent_role,
            "task_description": event.task_description,
            "content": event.content,
        },
    )

    # Trigger entity extraction and vector upsert
    entities = extract_entities(event.content)
    for ent in entities:
        await repo.insert_memory_entity(
            db,
            {
                "memory_event_id": record["id"],
                "entity_type": ent["entity_type"],
                "entity_text": ent["entity_text"],
            },
        )

    vstore.upsert_memory(
        memory_event_id=record["id"],
        content=event.content,
        metadata={
            "user_id": user_id,
            "swarm_run_id": event.swarm_run_id,
            "agent_role": event.agent_role,
            "created_at": record.get("created_at", ""),
        },
    )
    return record["id"]
