import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useApprovalStore, ApprovalRequest } from '../../stores/useApprovalStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ShieldCheck, X, Check, AlertTriangle, ShieldAlert, Shield } from 'lucide-react';

const riskConfig = {
  high:   { badge: 'bg-ruby/10 text-ruby border-ruby/30',     glow: 'shadow-[0_0_16px_rgba(225,29,72,0.25)]',    icon: ShieldAlert, dot: 'bg-ruby'    },
  medium: { badge: 'bg-amber/10 text-amber border-amber/30',   glow: 'shadow-[0_0_16px_rgba(245,158,11,0.2)]',   icon: AlertTriangle, dot: 'bg-amber'  },
  low:    { badge: 'bg-emerald/10 text-emerald border-emerald/30', glow: 'shadow-[0_0_16px_rgba(16,185,129,0.15)]', icon: Shield, dot: 'bg-emerald' },
};

export const ApprovalCenter: React.FC = () => {
  const pendingApprovals    = useApprovalStore((s) => s.pendingApprovals);
  const setPendingApprovals = useApprovalStore((s) => s.setPendingApprovals);
  const removeApprovalById  = useApprovalStore((s) => s.removeApprovalById);
  const [rejectId, setRejectId]     = useState<string | null>(null);
  const [rejectReason, setReason]   = useState('');
  const [loading, setLoading]       = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await api.get<ApprovalRequest[]>('/approvals?status=pending');
      setPendingApprovals(res.data);
    } catch { /* silent */ }
  }, [setPendingApprovals]);

  useEffect(() => { void fetchApprovals(); }, [fetchApprovals]);

  const handleApprove = async (id: string) => {
    setLoading(true);
    const toastId = toast.loading('Approving action…');
    try {
      await api.post(`/approvals/${id}/approve`);
      removeApprovalById(id);
      toast.success('Action approved.', { id: toastId });
    } catch {
      toast.error('Approval failed.', { id: toastId });
    } finally { setLoading(false); }
  };

  const handleReject = async (id: string) => {
    setLoading(true);
    const toastId = toast.loading('Rejecting action…');
    try {
      await api.post(`/approvals/${id}/reject`, { reason: rejectReason });
      removeApprovalById(id);
      setRejectId(null);
      setReason('');
      toast.success('Action rejected.', { id: toastId });
    } catch {
      toast.error('Rejection failed.', { id: toastId });
    } finally { setLoading(false); }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="page-title">Approval Center</h1>
        <p className="text-[14px] text-ink-4 mt-2">
          Human-in-the-loop decisions for your active agent fleet.
        </p>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {pendingApprovals.length === 0 ? (
          /* ── Empty state ── */
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass rounded-2xl p-16 flex flex-col items-center gap-5 relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06), transparent 60%)' }}
            />
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/15 animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl border border-primary/25 bg-primary/10 shadow-glow-blue flex items-center justify-center">
                <ShieldCheck size={28} className="text-primary" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-[22px] text-ink mb-2">All Systems Clear</h3>
              <p className="text-[14px] text-ink-4 max-w-sm">
                No pending approvals. Your agents are executing autonomously.
              </p>
            </div>
          </motion.div>
        ) : (
          /* ── Approval cards ── */
          <div className="space-y-5">
            {pendingApprovals.map((req, i) => {
              const risk    = riskConfig[req.risk_level as keyof typeof riskConfig] ?? riskConfig.low;
              const RiskIcon = risk.icon;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, scale: 0.96 }}
                  transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  layout
                  className="glass rounded-2xl overflow-hidden relative"
                  style={{
                    boxShadow: risk.glow.replace('shadow-[', '').replace(']', ''),
                  }}
                >
                  {/* Left risk border */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{
                      background: req.risk_level === 'high' ? '#e11d48' :
                                  req.risk_level === 'medium' ? '#f59e0b' : '#10b981',
                    }}
                  />

                  <div className="p-6 pl-8">
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-[15px] font-bold text-ink font-mono tracking-wide uppercase">
                          {req.tool_name}
                        </h3>
                        <p className="text-[12px] text-ink-4 mt-1 font-mono">
                          Run: {req.swarm_run_id}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider self-start ${risk.badge}`}
                      >
                        <RiskIcon size={11} />
                        {req.risk_level} Risk
                      </span>
                    </div>

                    {/* Payload */}
                    <div className="mb-5">
                      <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-4 mb-2.5 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                        Proposed Payload
                      </div>
                      <div className="rounded-xl border border-border overflow-hidden max-h-52 overflow-y-auto">
                        <SyntaxHighlighter
                          language="json"
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, background: '#0a0a0c', fontSize: '12px', padding: '16px' }}
                        >
                          {JSON.stringify(req.proposed_payload, null, 2)}
                        </SyntaxHighlighter>
                      </div>
                    </div>

                    {/* Reject reason input */}
                    <AnimatePresence>
                      {rejectId === req.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 overflow-hidden"
                        >
                          <div className="border-t border-border pt-4 space-y-3">
                            <label className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-4">
                              Rejection Reason
                            </label>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Provide feedback to guide agent replanning…"
                              rows={2}
                              className="input-dark w-full resize-none rounded-xl px-4 py-3 text-[13px]"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                      {rejectId === req.id ? (
                        <>
                          <motion.button
                            onClick={() => { setRejectId(null); setReason(''); }}
                            className="btn-ghost rounded-xl px-4 py-2 text-[13px] font-medium"
                            whileTap={{ scale: 0.97 }}
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            onClick={() => handleReject(req.id)}
                            disabled={loading || !rejectReason.trim()}
                            className="flex items-center gap-2 rounded-xl bg-ruby/90 px-5 py-2 text-[13px] font-semibold text-white hover:bg-ruby hover:shadow-glow-ruby transition-all disabled:opacity-50"
                            whileTap={{ scale: 0.97 }}
                          >
                            <X size={14} />
                            Confirm Rejection
                          </motion.button>
                        </>
                      ) : (
                        <>
                          <motion.button
                            onClick={() => setRejectId(req.id)}
                            className="flex items-center gap-2 rounded-xl border border-ruby/30 bg-ruby/10 px-5 py-2 text-[13px] font-semibold text-ruby hover:border-ruby/50 hover:bg-ruby/20 transition-all"
                            whileTap={{ scale: 0.97 }}
                          >
                            <X size={14} />
                            Reject
                          </motion.button>
                          <motion.button
                            onClick={() => handleApprove(req.id)}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-xl bg-emerald/90 px-5 py-2 text-[13px] font-bold text-white hover:bg-emerald hover:shadow-glow-emerald transition-all disabled:opacity-50"
                            whileTap={{ scale: 0.97 }}
                          >
                            <Check size={14} />
                            Approve
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
