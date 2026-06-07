// NEW — Implemented by: workstream/3c-dashboard-trace
import { create } from 'zustand';
import { TraceBootstrapTask, WebSocketEvent } from '../types/websocket';
import { useSwarmStore } from './useSwarmStore';

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connectedSwarmId: string | null;
  connect: (swarmRunId: string, token: string) => void;
  disconnect: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connectedSwarmId: null,

  connect: (swarmRunId, token) => {
    const existingSocket = get().socket;
    if (existingSocket) {
      if (get().connectedSwarmId === swarmRunId) {
        return;
      }
      existingSocket.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws/${swarmRunId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ isConnected: true });
    };

    ws.onmessage = (event) => {
      try {
        const payload: WebSocketEvent = jsonParseSafely(event.data);
        if (!payload) {
          return;
        }

        const swarmStore = useSwarmStore.getState();

        if (payload.type === 'TRACE_BOOTSTRAP') {
          const tasks = (((payload.data as { tasks?: TraceBootstrapTask[] })?.tasks) ?? []).map((task) => ({
            id: task.task_id,
            agent: task.agent,
            thought: task.description,
            action: '',
            observation: '',
            status: task.status ?? 'pending',
          }));
          swarmStore.replaceTasks(tasks);
        } else if (payload.type === 'SWARM_STARTED') {
          swarmStore.setSwarmStatus('running');
        } else if (payload.type === 'SWARM_COMPLETED') {
          swarmStore.setSwarmStatus('completed');
        } else if (payload.type === 'SWARM_FAILED') {
          swarmStore.setSwarmStatus('failed');
          const runningTaskId = getRunningTaskId();
          if (runningTaskId) {
            swarmStore.updateTask(runningTaskId, {
              status: 'failed',
              observation: stringifyMaybe((payload.data as { error?: unknown })?.error),
            });
          }
        } else if (payload.type === 'TASK_STARTED') {
          const taskData = payload.data as {
            task_id: string;
            agent: string;
            description?: string;
          };
          swarmStore.setSwarmStatus('running');
          swarmStore.upsertTask({
            id: taskData.task_id,
            agent: taskData.agent,
            thought: taskData.description || 'Task initialized.',
            action: '',
            observation: '',
            status: 'running',
          });
        } else if (payload.type === 'TASK_COMPLETED') {
          const taskData = payload.data as {
            task_id: string;
            output?: unknown;
          };
          swarmStore.updateTask(taskData.task_id, {
            status: 'completed',
            observation: stringifyMaybe(taskData.output),
          });
        } else if (payload.type === 'AGENT_THOUGHT') {
          const taskData = payload.data as {
            task_id: string;
            thought?: string;
            action?: unknown;
            observation?: unknown;
          };
          swarmStore.updateTask(taskData.task_id, {
            thought: taskData.thought ?? '',
            action: stringifyMaybe(taskData.action),
            observation: taskData.observation ? stringifyMaybe(taskData.observation) : undefined,
          });
        } else if (payload.type === 'APPROVAL_REQUESTED') {
          const runningTaskId = getRunningTaskId();
          if (runningTaskId) {
            swarmStore.updateTask(runningTaskId, {
              action: stringifyMaybe((payload.data as { proposed_payload?: unknown })?.proposed_payload),
              observation: 'Awaiting approval before external action can continue...',
            });
          }
        } else if (payload.type === 'APPROVAL_GRANTED') {
          const runningTaskId = getRunningTaskId();
          if (runningTaskId) {
            swarmStore.updateTask(runningTaskId, {
              observation: 'Approval granted. Executor resumed external action.',
            });
          }
        } else if (payload.type === 'APPROVAL_REJECTED') {
          const runningTaskId = getRunningTaskId();
          if (runningTaskId) {
            swarmStore.updateTask(runningTaskId, {
              observation: `Approval rejected: ${stringifyMaybe((payload.data as { reason?: unknown })?.reason)}`,
            });
          }
        } else if (payload.type === 'BRIEFING_READY') {
          swarmStore.setBriefingUrl((payload.data as { audio_url?: string })?.audio_url ?? null);
        }
      } catch (err) {
        console.error('Error handling WebSocket message payload', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket connection error', event);
    };

    ws.onclose = () => {
      set({ isConnected: false, socket: null, connectedSwarmId: null });
    };

    set({ socket: ws, connectedSwarmId: swarmRunId });
  },

  disconnect: () => {
    const ws = get().socket;
    if (ws) {
      ws.close();
    }
    set({ socket: null, isConnected: false, connectedSwarmId: null });
  },
}));

function jsonParseSafely(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function stringifyMaybe(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getRunningTaskId() {
  const tasks = useSwarmStore.getState().tasks;
  const runningTask = tasks.find((task) => task.status === 'running');
  return runningTask?.id ?? null;
}
