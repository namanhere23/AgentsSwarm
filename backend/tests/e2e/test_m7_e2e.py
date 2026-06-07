import pytest
import asyncio
import httpx
import websockets
import json

@pytest.mark.asyncio
async def test_full_swarm_approval_audit_report_flow():
    """
    Complete E2E validation:
    Trigger Swarm -> Verify WS events -> Wait for Approval request ->
    Approve -> Verify Audit Entry -> Verify Report creation
    """
    base_url = "http://localhost:8000"
    ws_url = "ws://localhost:8000/ws"
    auth_headers = {"Authorization": "Bearer test_user_uuid"}

    # Step 1: Submit swarm run request
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{base_url}/swarms", json={
                "crew_id": "research-crew",
                "objective": "Research the top 3 AI DevTools startups."
            }, headers=auth_headers)
            
            # If API is not running, we skip the E2E test
            if res.status_code == 404 or res.status_code == 502:
                pytest.skip("E2E Test skipped because API is not reachable on localhost:8000")
                
            assert res.status_code == 202
            swarm_run_id = res.json()["swarm_run_id"]
    except httpx.ConnectError:
        pytest.skip("E2E Test skipped because FastAPI is not running on localhost:8000")

    # Step 2 & 3: Listen on websocket connection channel (authenticating in query params)
    ws_connection = f"{ws_url}/{swarm_run_id}?token=test_user_uuid"
    try:
        async with websockets.connect(ws_connection) as ws:
            # Await SWARM_STARTED event
            msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            event = json.loads(msg)
            assert event["type"] == "SWARM_STARTED"

            # Step 4: Await APPROVAL_REQUESTED event (tool trigger)
            approval_event = None
            for _ in range(50): # Poll up to 10s
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                event = json.loads(msg)
                if event["type"] == "APPROVAL_REQUESTED":
                    approval_event = event
                    break
            
            assert approval_event is not None
            approval_id = approval_event["data"]["approval_request_id"]

            # Step 5: Approve the request via REST API
            async with httpx.AsyncClient() as client:
                app_res = await client.post(f"{base_url}/approvals/{approval_id}/approve", headers=auth_headers)
                assert app_res.status_code == 200
                assert app_res.json()["status"] == "approved"

            # Step 6: Verify APPROVAL_GRANTED WebSocket event
            granted_msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            granted_event = json.loads(granted_msg)
            assert granted_event["type"] == "APPROVAL_GRANTED"

            # Step 7: Await SWARM_COMPLETED event
            completed_event = None
            for _ in range(50):
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                event = json.loads(msg)
                if event["type"] == "SWARM_COMPLETED":
                    completed_event = event
                    break
            assert completed_event is not None

        # Step 8: Verify report compiled
        async with httpx.AsyncClient() as client:
            rep_res = await client.get(f"{base_url}/workspace/{swarm_run_id}.md", headers=auth_headers)
            assert rep_res.status_code == 200
            assert "# Swarm Run Execution Report" in rep_res.text
            
    except ConnectionRefusedError:
        pytest.skip("E2E Test skipped because WebSocket server is not reachable")
