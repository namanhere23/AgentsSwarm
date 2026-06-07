import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';

describe('Auth Zustand Store state transitions', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('initializes with null token and user_id', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user_id).toBeNull();
  });

  it('correctly transitions state on login', () => {
    useAuthStore.getState().login('mock_token', 'mock_uid');
    
    const state = useAuthStore.getState();
    expect(state.token).toBe('mock_token');
    expect(state.user_id).toBe('mock_uid');
  });

  it('correctly clears tokens on logout', () => {
    useAuthStore.getState().login('mock_token', 'mock_uid');
    useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user_id).toBeNull();
  });
});
