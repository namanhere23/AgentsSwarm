// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
});
import { SwarmLauncher } from '../pages/dashboard/SwarmLauncher';
import { BrowserRouter } from 'react-router-dom';

// Mock API modules
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [{ id: 'test-crew', name: 'Test Crew' }] })),
    post: vi.fn(() => Promise.resolve({ data: { swarm_run_id: 'test_id_123' } }))
  }
}));

describe('SwarmLauncher component validation', () => {
  it('disables trigger launch button on empty inputs', () => {
    render(
      <BrowserRouter>
        <SwarmLauncher />
      </BrowserRouter>
    );

    const btn = screen.getByRole('button', { name: /Launch Swarm/i });
    expect(btn).toBeDisabled();
  });

  it('enables submit once objective has text content', async () => {
    render(
      <BrowserRouter>
        <SwarmLauncher />
      </BrowserRouter>
    );

    const txt = screen.getByPlaceholderText(/What goal should the agent crew accomplish?/i);
    fireEvent.change(txt, { target: { value: 'Analyze market' } });
    
    const btn = screen.getByRole('button', { name: /Launch Swarm/i });
    expect(btn).not.toBeDisabled();
  });
});
