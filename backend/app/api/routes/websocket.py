# STUB — Implemented by: workstream/3b-websocket-reports
from fastapi import APIRouter, WebSocket

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/{swarm_run_id}")
async def websocket_endpoint(websocket: WebSocket, swarm_run_id: str):
    raise NotImplementedError()
