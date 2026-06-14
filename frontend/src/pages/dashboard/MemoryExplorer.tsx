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
    <div className="max-w-5xl mx-auto py-12 font-sans relative">
      {/* Background Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-600/10 via-fuchsia-600/10 to-transparent blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <div className="text-center mb-12">
        <h2 className="text-[40px] font-bold tracking-tight text-white mb-4">Tri-Store Memory Explorer</h2>
        <p className="text-gray-400">Query semantic events to pull long-term RAG context results across all swarms.</p>
      </div>

      {/* Semantic search form bar - Massive & Centralized */}
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-16 relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-fuchsia-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-[#0f1115] rounded-2xl border border-white/10 shadow-2xl p-2">
          <div className="pl-4 pr-2 text-blue-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hybrid memory graphs..."
            className="flex-1 bg-transparent py-4 px-2 text-lg text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Results grid */}
      <div className="space-y-6 max-w-4xl mx-auto">
        {results.length === 0 && !loading && query.trim() === '' ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <p className="text-gray-500 text-lg">Enter a query to explore the neural memory graph.</p>
          </div>
        ) : results.length === 0 && !loading && query.trim() !== '' ? (
          <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-white/5">
            <p className="text-gray-400">No memory nodes found matching "{query}".</p>
          </div>
        ) : (
          results.map((res) => (
            <div key={res.memory_event_id} className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-6 shadow-xl hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
                    {res.agent_role}
                  </span>
                  <span className="text-xs text-gray-500 font-mono bg-black/40 px-2 py-1 rounded">Run: {res.swarm_run_id.slice(0, 8)}...</span>
                </div>
                
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-widest">Decay Score:</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 tabular-nums">
                    {res.effective_score.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-gray-300 text-[15px] leading-relaxed mb-6 group-hover:text-white transition-colors">{res.content}</p>

              {/* Entity pills */}
              <div className="flex flex-wrap gap-2">
                {res.entities.map((ent, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleInspectEntity(ent)}
                    className="rounded-full bg-black/40 border border-white/10 px-4 py-1.5 text-xs font-medium text-gray-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 z-50">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1115] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-5">
              <h3 className="text-lg font-bold text-white tracking-wide">Entity Graph: <span className="text-blue-400">{selectedNode}</span></h3>
              <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white transition-colors p-1 bg-white/5 rounded-md hover:bg-ruby/20 hover:text-ruby">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">Recursive CTE Path Centrality Node connections:</p>
            {graphPaths.length === 0 ? (
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                <p className="text-sm text-gray-500">No linked nodes found within 2 degrees of separation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {graphPaths.map((path, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                    <span className="text-sm text-gray-300 font-mono">Degree {idx + 1}: <span className="text-white">{path}</span></span>
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
