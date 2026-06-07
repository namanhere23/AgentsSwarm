// NEW — Implemented by: workstream/3c-dashboard-trace
import { create } from 'zustand';
import { WebSocketEvent } from '../types/websocket';
import { useSwarmStore } from './useSwarmStore';

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: (swarmRunId: string, token: string) => void;
  disconnect: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  
  connect: (swarmRunId, token) => {
    // Prevent duplicate triggers
    if (get().socket) return;
    
    // Connect to backend WS endpoint (routed through dev proxy configuration)
    const wsUrl = `ws://${window.location.host}/ws/${swarmRunId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      set({ isConnected: true });
    };
    
    ws.onmessage = (event) => {
      try {
        const payload: WebSocketEvent = jsonParseSafely(event.data);
        if (!payload) return;
        
        // Forward message details to Swarms State Manager
        const swarmStore = useSwarmStore.getState();
        
        if (payload.type === 'SWARM_STARTED') {
          swarmStore.setSwarmStatus('running');
        } else if (payload.type === 'SWARM_COMPLETED') {
          swarmStore.setSwarmStatus('completed');
        } else if (payload.type === 'TASK_STARTED') {
          const taskData = payload.data as any;
          swarmStore.addTask({
            id: taskData.task_id,
            agent: taskData.agent,
            thought: 'Task initialized...',
            action: '',
            observation: '',
            status: 'running'
          });
        } else if (payload.type === 'TASK_COMPLETED') {
          const taskData = payload.data as any;
          swarmStore.updateTask(taskData.task_id, {
            status: 'completed',
            observation: taskData.output
          });
        } else if (payload.type === 'AGENT_THOUGHT') {
          const tData = payload.data as any;
          swarmStore.updateTask(tData.task_id, {
            thought: tData.thought,
            action: tData.action
          });
        }
      } catch (err) {
        console.error('Error handling WebSocket message payload', err);
      }
    };
    
    ws.onclose = () => {
      set({ isConnected: false, socket: null });
    };
    
    set({ socket: ws });
  },
  
  disconnect: () => {
    const ws = get().socket;
    if (ws) {
      ws.close();
    }
    set({ socket: null, isConnected: false });
  }
}));

function jsonParseSafely(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
