// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApprovalCenter } from '../pages/dashboard/ApprovalCenter';
import { useApprovalStore } from '../stores/useApprovalStore';

// Mock api service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] }))
  }
}));

describe('ApprovalCenter component loading layout', () => {
  it('correctly visualizes empty status when state holds no pending requests', () => {
    useApprovalStore.getState().setPendingApprovals([]);
    render(<ApprovalCenter />);
    
    expect(screen.getByText(/No pending approvals found/i)).toBeInTheDocument();
  });
});
