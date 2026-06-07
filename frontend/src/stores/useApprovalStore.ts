// NEW — Implemented by: workstream/4c-approval-dashboard
import { create } from 'zustand';

export interface ApprovalRequest {
  id: string;
  user_id: string;
  swarm_run_id: string;
  tool_name: string;
  proposed_payload: Record<string, any>;
  risk_level: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  rejection_reason: string | null;
  created_at: string;
}

interface ApprovalStore {
  pendingApprovals: ApprovalRequest[];
  addPendingApproval: (approval: ApprovalRequest) => void;
  removeApprovalById: (id: string) => void;
  setPendingApprovals: (approvals: ApprovalRequest[]) => void;
}

export const useApprovalStore = create<ApprovalStore>((set) => ({
  pendingApprovals: [],
  addPendingApproval: (approval) => set((state) => ({
    // De-duplicate items automatically
    pendingApprovals: state.pendingApprovals.some((a) => a.id === approval.id)
      ? state.pendingApprovals
      : [...state.pendingApprovals, approval]
  })),
  removeApprovalById: (id) => set((state) => ({
    pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id)
  })),
  setPendingApprovals: (approvals) => set({ pendingApprovals: approvals })
}));
