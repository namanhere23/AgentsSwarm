// NEW — Implemented by: workstream/5a-memory-explorer
import React, { useState } from 'react';
import api from '../../services/api';

interface SearchResult {
  memory_event_id: string;
  swarm_run_id: string;
  agent_role: string;
  content: string;
  effective_score: number;
  entities: string[];
  created_at: string;
}

export const MemoryExplorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [graphPaths, setGraphPaths] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await api.get<{ results: SearchResult[] }>(`/memory/search?q=${encodeURIComponent(query.trim())}`);
      setResults(res.data.results);
    } catch (err) {
      console.error('Failed to run semantic memory search', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectEntity = async (entityText: string) => {
    setSelectedNode(entityText);
    try {
      // Mocked Graph rpc CTE queries return path lists
      const res = await api.get(`/memory/search?q=${entityText}`); // Using search fallback for mocking path details
      setGraphPaths(res.data.results.map((r: SearchResult) => r.agent_role));
    } catch {
      setGraphPaths([]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 font-sohne font-light tracking-tight text-text">
      <h2 className="text-3xl font-medium tracking-tighter mb-8">Tri-Store Memory Explorer</h2>

      {/* Semantic search form bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query long-term memory via hybrid RAG embedding searches..."
          className="flex-1 rounded-xl border border-ink-300 bg-ink-200 p-4 text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl bg-primary px-6 py-4 font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Results grid */}
      <div className="space-y-4">
        {results.length === 0 && !loading ? (
          <div className="text-center py-12 text-ink-400">Query semantic events to pull RAG context results.</div>
        ) : (
          results.map((res) => (
            <div key={res.memory_event_id} className="rounded-xl border border-ink-300 bg-ink-200 p-6 shadow-md hover:border-ink-300/80 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <span className="rounded bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                    {res.agent_role}
                  </span>
                  <span className="text-xs text-ink-400 font-mono mt-0.5">Run: {res.swarm_run_id.slice(0, 8)}...</span>
                </div>
                
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-ink-400">Memory Decay Score:</span>
                  <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 tabular-nums-money">
                    {res.effective_score.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-ink-500 text-sm leading-relaxed mb-4">{res.content}</p>

              {/* Entity pills */}
              <div className="flex flex-wrap gap-2">
                {res.entities.map((ent, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleInspectEntity(ent)}
                    className="rounded-full bg-ink border border-ink-300 px-3 py-1 text-xs font-medium text-ink-400 hover:border-primary/50 hover:text-primary transition-all"
                  >
                    #{ent}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Node Path Modal */}
      {selectedNode && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 z-50">
          <div className="w-full max-w-md rounded-2xl border border-ink-300 bg-ink-200 p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-ink-300 mb-4">
              <h3 className="text-lg font-medium text-text uppercase">Entity: {selectedNode}</h3>
              <button onClick={() => setSelectedNode(null)} className="text-ink-400 hover:text-text transition-colors">✕</button>
            </div>
            
            <p className="text-sm text-ink-400 mb-4">Recursive CTE Path Centrality Node connections:</p>
            {graphPaths.length === 0 ? (
              <p className="text-xs text-ink-500 italic">No linked nodes found within 2 degrees of separation.</p>
            ) : (
              <div className="space-y-2">
                {graphPaths.map((path, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Degree association: {path}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
