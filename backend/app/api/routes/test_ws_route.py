import asyncio
from fastapi import APIRouter, WebSocket

router = APIRouter()

@router.websocket("/test_ping")
async def test_ping(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("pong")
    await websocket.close()
