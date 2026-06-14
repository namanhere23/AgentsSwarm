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
    <div className="max-w-4xl mx-auto py-8 font-sans">
      <h2 className="text-[32px] font-light tracking-[-0.64px] text-ink mb-8">Approval Center</h2>
      
      {pendingApprovals.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f1115]/80 backdrop-blur-md p-16 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/5 blur-[100px] pointer-events-none rounded-full"></div>
          
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-[#1a1d24] border border-white/10 rounded-2xl p-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <svg className="h-10 w-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-xl font-medium text-white mb-2 tracking-wide">All Systems Clear</h3>
          <p className="text-gray-400 text-sm max-w-sm text-center">
            No pending approvals found. Your agent swarms are executing autonomously without requiring human intervention.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingApprovals.map((req) => (
            <div key={req.id} className="rounded-2xl border border-hairline-input bg-canvas-soft/60 backdrop-blur-md p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-ink uppercase tracking-wide">{req.tool_name}</h3>
                  <p className="text-[13px] text-ink-mute mt-1">Swarm Run ID: {req.swarm_run_id}</p>
                </div>
                
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${
                  req.risk_level === 'high' ? 'bg-ruby/10 text-ruby border-ruby/30 shadow-[0_0_10px_rgba(225,29,72,0.2)]' :
                  req.risk_level === 'medium' ? 'bg-lemon/10 text-lemon border-lemon/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                }`}>
                  {req.risk_level} Risk
                </span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-ink-mute/80 uppercase tracking-widest mb-2">Proposed Payload Data:</h4>
                <div className="rounded-xl overflow-hidden border border-hairline-input max-h-60 overflow-y-auto bg-black/40">
                  <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ margin: 0, background: 'transparent' }}>
                    {JSON.stringify(req.proposed_payload, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </div>

              {rejectId === req.id ? (
                <div className="space-y-3 border-t border-hairline-input pt-4">
                  <label className="block text-xs font-semibold text-ink-mute/80 uppercase tracking-widest">Rejection Context / Feedback:</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide comments to guide replanning..."
                    rows={2}
                    className="w-full rounded-xl border border-hairline-input bg-canvas-soft p-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-sm resize-none transition-all"
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setRejectId(null)}
                      className="rounded-lg px-4 py-2 text-sm text-ink-mute hover:text-ink transition-colors hover:bg-canvas-soft"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={loading || !rejectReason.trim()}
                      className="rounded-lg bg-ruby/90 px-6 py-2 text-sm font-semibold text-white hover:bg-ruby hover:shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all disabled:opacity-50"
                    >
                      Send Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 border-t border-hairline-input pt-4 justify-end">
                  <button
                    onClick={() => setRejectId(req.id)}
                    className="rounded-lg border border-ruby/30 bg-ruby/10 px-6 py-2 text-sm font-semibold text-ruby hover:bg-ruby/20 hover:border-ruby/50 transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={loading}
                    className="rounded-lg bg-emerald-600/90 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
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
