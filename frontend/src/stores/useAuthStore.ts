// STUB — Implemented by: workstream/0-architect (Full implementation - zero dependencies)
import { create } from 'zustand';

interface AuthState {
  user_id: string | null;
  token: string | null;
  login: (token: string, uid: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user_id: null,
  token: null,
  login: (token, uid) => set({ token, user_id: uid }),
  logout: () => set({ token: null, user_id: null }),
}));
