// NEW — Implemented by: workstream/4c-approval-dashboard
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

interface AuditEntry {
  id: string;
  approval_request_id: string;
  tool_name: string;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: AuditEntry[] }>(`/audit/logs?page=${page}&limit=15`);
      setLogs(res.data.data);
    } catch (err) {
      console.error('Failed to load audit logs history', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="max-w-6xl mx-auto py-8 font-sans">
      <div className="mb-8">
        <h2 className="text-[32px] font-light tracking-[-0.64px] text-white">System Audit Trail</h2>
        <p className="text-gray-400 mt-1 text-sm">Immutable ledger of all agent swarm operations and tool payloads.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0f1115] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#1a1d24] text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-white/10">
              <tr>
                <th className="p-5 font-medium">Timestamp</th>
                <th className="p-5 font-medium">Action Tool</th>
                <th className="p-5 font-medium">Duration</th>
                <th className="p-5 text-right font-medium">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-12">
                    <div className="flex items-center justify-center gap-3 text-blue-400">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Querying secure audit ledger...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-0">
                    <div className="text-center py-24 bg-gradient-to-b from-transparent to-white/[0.02]">
                      <div className="w-20 h-20 bg-[#1a1d24] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] rotate-3">
                        <svg className="w-10 h-10 text-gray-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <p className="text-white text-lg font-medium mb-1">No logs found on the audit trail.</p>
                      <p className="text-gray-500 text-sm">Swarms have not executed any logged actions yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-5 text-xs font-mono text-gray-400 group-hover:text-gray-300">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-5 font-semibold text-white tracking-wide">{log.tool_name}</td>
                    <td className="p-5 text-xs font-mono text-blue-400">{log.duration_ms ? `${log.duration_ms}ms` : 'N/A'}</td>
                    <td className="p-5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold tracking-widest text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all uppercase"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between p-4 bg-[#1a1d24] border-t border-white/10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 bg-[#0f1115] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white hover:border-white/30 transition-all disabled:opacity-30 disabled:hover:border-white/10"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Page <span className="text-white">{page}</span></span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length < 15}
            className="rounded-lg border border-white/10 bg-[#0f1115] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-white hover:border-white/30 transition-all disabled:opacity-30 disabled:hover:border-white/10"
          >
            Next
          </button>
        </div>
      </div>

      {/* Inspect payload details sidebar sheet */}
      {selectedLog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 z-50">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0f1115] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-white uppercase tracking-wide">
                <span className="text-blue-400">{selectedLog.tool_name}</span> Payload Details
              </h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-ruby transition-colors p-1.5 hover:bg-ruby/10 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 py-6 text-sm">
              <div>
                <h4 className="font-bold text-gray-500 mb-3 uppercase tracking-widest text-xs flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Input Payload
                </h4>
                <div className="bg-black/50 p-5 rounded-xl border border-white/5 overflow-x-auto">
                  <pre className="text-gray-300 font-mono text-sm leading-relaxed">
                    {JSON.stringify(selectedLog.input_payload, null, 2)}
                  </pre>
                </div>
              </div>
              {selectedLog.output_payload && (
                <div>
                  <h4 className="font-bold text-gray-500 mb-3 uppercase tracking-widest text-xs flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Output Payload
                  </h4>
                  <div className="bg-black/50 p-5 rounded-xl border border-white/5 overflow-x-auto">
                    <pre className="text-gray-300 font-mono text-sm leading-relaxed">
                      {JSON.stringify(selectedLog.output_payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
