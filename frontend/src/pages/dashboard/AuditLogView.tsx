import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ClipboardList, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string;
  approval_request_id: string;
  tool_name: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

const containerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const rowVariants: Variants = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { ease: "easeOut" } },
};

export const AuditLogView: React.FC = () => {
  const [logs, setLogs]             = useState<AuditEntry[]>([]);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [selectedLog, setSelected]  = useState<AuditEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AuditEntry[] }>(`/audit/logs?page=${page}&limit=15`);
      setLogs(res.data.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  return (
    <div className="page-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="page-title">System Audit Trail</h1>
        <p className="text-[14px] text-ink-2 mt-2">
          Immutable ledger of all agent operations and tool invocations.
        </p>
      </motion.div>

      {/* Table card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-canvas-1">
                {['Timestamp', 'Tool / Action', 'Duration', 'Inspection'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-4 text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-2 ${i === 3 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-border-md animate-spin" style={{ borderTopColor: '#3b82f6' }} />
                      <span className="text-[14px] text-ink-2">Querying audit ledger…</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardList size={32} className="text-ink-5" />
                      <div>
                        <p className="text-[15px] font-medium text-ink-2">No audit entries yet</p>
                        <p className="text-[13px] text-ink-5 mt-1">Execute swarm runs to populate the trail.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <motion.tbody
                  key={page}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {logs.map((log) => (
                    <motion.tr
                      key={log.id}
                      variants={rowVariants}
                      className="hover:bg-white/[0.025] transition-colors group cursor-default"
                    >
                      <td className="px-5 py-4 text-[12px] font-mono text-ink-2 group-hover:text-ink-2 transition-colors whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-bold text-ink tracking-wide uppercase font-mono">
                          {log.tool_name}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-mono text-primary tabular-nums">
                          {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <motion.button
                          onClick={() => setSelected(log)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-[11px] font-bold tracking-wider uppercase text-primary hover:bg-primary/20 hover:border-primary/40 transition-all"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Search size={11} />
                          Inspect
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-canvas-1">
          <motion.button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-medium disabled:opacity-30"
            whileTap={{ scale: 0.97 }}
          >
            <ChevronLeft size={14} /> Previous
          </motion.button>
          <span className="text-[12px] text-ink-2 tracking-widest uppercase">
            Page <span className="text-ink font-bold">{page}</span>
          </span>
          <motion.button
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length < 15}
            className="btn-ghost flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-medium disabled:opacity-30"
            whileTap={{ scale: 0.97 }}
          >
            Next <ChevronRight size={14} />
          </motion.button>
        </div>
      </motion.div>

      {/* Inspect Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setSelected(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
              className="w-full max-w-2xl glass-md rounded-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                <div>
                  <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-2">Payload Details</span>
                  <h3 className="text-[16px] font-bold text-primary font-mono mt-0.5">{selectedLog.tool_name}</h3>
                </div>
                <motion.button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-xl text-ink-2 hover:text-ruby hover:bg-ruby/10 transition-all"
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-2">Input Payload</span>
                  </div>
                  <pre className="bg-canvas rounded-xl border border-border p-4 text-[12px] font-mono text-ink-2 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {JSON.stringify(selectedLog.input_payload, null, 2)}
                  </pre>
                </div>
                {selectedLog.output_payload && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
                      <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-2">Output Payload</span>
                    </div>
                    <pre className="bg-canvas rounded-xl border border-border p-4 text-[12px] font-mono text-ink-2 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {JSON.stringify(selectedLog.output_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
