import { create } from 'zustand';
import { useSwarmStore } from './useSwarmStore';

interface WebSocketState {
  isConnected: boolean;
  abortController: AbortController | null;
  connect: (swarmRunId: string, token: string | null) => void;
  disconnect: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  isConnected: false,
  abortController: null,
  
  connect: async (swarmRunId, token) => {
    // Prevent duplicate triggers
    if (get().isConnected) return;
    
    const effectiveToken = token || 'dev-token';
    const sseBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const sseUrl = `${sseBaseUrl}/sse/${swarmRunId}?token=${effectiveToken}`;
    
    const abortController = new AbortController();
    set({ isConnected: true, abortController });
    
    try {
      const response = await fetch(sseUrl, {
        signal: abortController.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('[SSE] fetch started');
      if (!response.body) throw new Error('No readable stream');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      console.log('[SSE] reader loop starting');
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        console.log('[SSE] chunk received. done:', done, 'bytes:', value?.length);
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (!payload) continue;
              
              // Forward message details to Swarms State Manager
              const swarmStore = useSwarmStore.getState();
              
              if (payload.type === 'SWARM_STARTED') {
                swarmStore.setSwarmStatus('running');
              } else if (payload.type === 'SWARM_COMPLETED') {
                swarmStore.setSwarmStatus('completed');
                swarmStore.setFinalOutput((payload.data as any)?.output || null);
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
              console.error('Error parsing SSE line', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[SSE] Fetch error:', err);
      }
    } finally {
      set({ isConnected: false, abortController: null });
    }
  },
  
  disconnect: () => {
    const ac = get().abortController;
    if (ac) {
      ac.abort();
    }
    set({ isConnected: false, abortController: null });
  }
}));
