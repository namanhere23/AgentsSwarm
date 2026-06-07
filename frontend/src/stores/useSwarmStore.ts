// NEW — Implemented by: workstream/3c-dashboard-trace
import { create } from 'zustand';
import { TaskTrace } from '../types/swarm';

interface SwarmState {
  activeSwarmId: string | null;
  swarmStatus: 'queued' | 'running' | 'completed' | 'failed';
  tasks: TaskTrace[];
  briefingUrl: string | null;
  
  setActiveSwarm: (id: string | null) => void;
  setSwarmStatus: (status: 'queued' | 'running' | 'completed' | 'failed') => void;
  setBriefingUrl: (url: string | null) => void;
  addTask: (task: TaskTrace) => void;
  updateTask: (id: string, update: Partial<TaskTrace>) => void;
  clearStore: () => void;
}

export const useSwarmStore = create<SwarmState>((set) => ({
  activeSwarmId: null,
  swarmStatus: 'queued',
  tasks: [],
  briefingUrl: null,
  
  setActiveSwarm: (id) => set({ activeSwarmId: id }),
  setSwarmStatus: (status) => set({ swarmStatus: status }),
  setBriefingUrl: (url) => set({ briefingUrl: url }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, update) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...update } : t)
  })),
  clearStore: () => set({ activeSwarmId: null, swarmStatus: 'queued', tasks: [], briefingUrl: null })
}));
