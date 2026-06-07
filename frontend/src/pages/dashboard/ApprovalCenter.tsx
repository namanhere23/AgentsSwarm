// NEW — Implemented by: workstream/4c-approval-dashboard
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useApprovalStore, ApprovalRequest } from '../../stores/useApprovalStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const ApprovalCenter: React.FC = () => {
  const pendingApprovals = useApprovalStore((state) => state.pendingApprovals);
  const setPendingApprovals = useApprovalStore((state) => state.setPendingApprovals);
  const removeApprovalById = useApprovalStore((state) => state.removeApprovalById);
  
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await api.get<ApprovalRequest[]>('/approvals?status=pending');
      setPendingApprovals(res.data);
    } catch (err) {
      console.error('Failed to load pending approvals from API', err);
    }
  }, [setPendingApprovals]);

  useEffect(() => {
    void fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      await api.post(`/approvals/${id}/approve`);
      removeApprovalById(id);
    } catch (err) {
      console.error('Approve dispatch failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setLoading(true);
    try {
      await api.post(`/approvals/${id}/reject`, { reason: rejectReason });
      removeApprovalById(id);
      setRejectId(null);
      setRejectReason('');
    } catch (err) {
      console.error('Reject dispatch failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 font-sohne font-light tracking-tight text-text">
      <h2 className="text-3xl font-medium tracking-tighter mb-8">Approval Center</h2>
      
      {pendingApprovals.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-ink-300 bg-ink-200 text-ink-400">
          <svg className="mx-auto h-12 w-12 text-ink-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          No pending approvals found. All systems executing autonomously.
        </div>
      ) : (
        <div className="space-y-6">
          {pendingApprovals.map((req) => (
            <div key={req.id} className="rounded-2xl border border-ink-300 bg-ink-200 p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium uppercase">{req.tool_name}</h3>
                  <p className="text-xs text-ink-400 mt-1">Swarm Run ID: {req.swarm_run_id}</p>
                </div>
                
                <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider border ${
                  req.risk_level === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  req.risk_level === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {req.risk_level} Risk
                </span>
              </div>

              <div>
                <h4 className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-2">Proposed Payload Data:</h4>
                <div className="rounded-lg overflow-hidden border border-ink-300 max-h-60 overflow-y-auto">
                  <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, background: 'transparent' }}>
                    {JSON.stringify(req.proposed_payload, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </div>

              {rejectId === req.id ? (
                <div className="space-y-3 border-t border-ink-300 pt-4">
                  <label className="block text-xs font-medium text-ink-400 uppercase">Rejection Context / Feedback:</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide comments to guide replanning..."
                    rows={2}
                    className="w-full rounded-lg border border-ink-300 bg-ink p-3 text-text focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setRejectId(null)}
                      className="rounded-lg px-4 py-2 text-sm text-ink-400 hover:text-text transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={loading || !rejectReason.trim()}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Send Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 border-t border-ink-300 pt-4 justify-end">
                  <button
                    onClick={() => setRejectId(req.id)}
                    className="rounded-lg border border-red-900/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={loading}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-all"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
