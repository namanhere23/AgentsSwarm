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
    <div className="max-w-6xl mx-auto py-8 font-sohne font-light tracking-tight text-text">
      <h2 className="text-3xl font-medium tracking-tighter mb-8">System Audit Trail</h2>

      <div className="rounded-2xl border border-ink-300 bg-ink-200 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-400">
            <thead className="bg-ink text-xs font-medium uppercase tracking-wider border-b border-ink-300">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action Tool</th>
                <th className="p-4">Duration</th>
                <th className="p-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/40">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-ink-400">Querying Postgres audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-8 text-ink-400">No logs found on the audit trail.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-ink-300/10 transition-colors">
                    <td className="p-4 text-xs font-mono">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-4 font-medium text-text">{log.tool_name}</td>
                    <td className="p-4 text-xs tabular-nums-money text-ink-400">{log.duration_ms ? `${log.duration_ms}ms` : 'N/A'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
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
        <div className="flex items-center justify-between p-4 bg-ink border-t border-ink-300">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-400 hover:text-text transition-colors disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-ink-400 tabular-nums-money">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length < 15}
            className="rounded border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-400 hover:text-text transition-colors disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>

      {/* Inspect payload details sidebar sheet */}
      {selectedLog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 z-50">
          <div className="w-full max-w-3xl rounded-2xl border border-ink-300 bg-ink-200 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-4 border-b border-ink-300">
              <h3 className="text-lg font-medium text-text uppercase">{selectedLog.tool_name} Payload Details</h3>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-ink-400 hover:text-text transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 py-4 text-xs">
              <div>
                <h4 className="font-medium text-ink-400 mb-2 uppercase tracking-wider">INPUT PAYLOAD:</h4>
                <pre className="bg-ink p-4 rounded-lg overflow-x-auto border border-ink-300 text-ink-400 font-mono">
                  {JSON.stringify(selectedLog.input_payload, null, 2)}
                </pre>
              </div>
              {selectedLog.output_payload && (
                <div>
                  <h4 className="font-medium text-ink-400 mb-2 uppercase tracking-wider mt-6">OUTPUT PAYLOAD:</h4>
                  <pre className="bg-ink p-4 rounded-lg overflow-x-auto border border-ink-300 text-ink-400 font-mono">
                    {JSON.stringify(selectedLog.output_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
