import React, { useState } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Search, Brain, X, Sparkles } from 'lucide-react';

interface SearchResult {
  memory_event_id: string;
  swarm_run_id: string;
  agent_role: string;
  content: string;
  effective_score: number;
  entities: string[];
  created_at: string;
}

const containerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } },
};

export const MemoryExplorer: React.FC = () => {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selectedNode, setNode]   = useState<string | null>(null);
  const [graphPaths, setPaths]    = useState<string[]>([]);
  const [hasSearched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get<{ results: SearchResult[] }>(`/memory/search?q=${encodeURIComponent(query.trim())}`);
      setResults(res.data.results);
    } catch { setResults([]); } finally { setLoading(false); }
  };

  const handleInspectEntity = async (entity: string) => {
    setNode(entity);
    try {
      const res = await api.get(`/memory/search?q=${encodeURIComponent(entity)}`);
      setPaths(res.data.results.map((r: SearchResult) => r.agent_role));
    } catch { setPaths([]); }
  };

  const scoreColor = (s: number) =>
    s >= 0.7 ? 'text-emerald bg-emerald/10 border-emerald/25' :
    s >= 0.4 ? 'text-amber bg-amber/10 border-amber/25' :
               'text-ruby bg-ruby/10 border-ruby/25';

  return (
    <div className="page-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center max-w-2xl mx-auto"
      >
        <div className="w-14 h-14 rounded-2xl border border-primary/25 bg-primary/10 shadow-glow-blue flex items-center justify-center mx-auto mb-5">
          <Brain size={26} className="text-primary" />
        </div>
        <h1 className="page-title mb-3">Memory Explorer</h1>
        <p className="text-[15px] text-ink-2">
          Query semantic memories across all swarm runs using RAG hybrid search.
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.form
        onSubmit={handleSearch}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="max-w-2xl mx-auto mb-12 relative group"
      >
        <div className="relative flex items-center bg-[#050505] border border-white/[0.08] rounded-xl focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40 transition-all shadow-inner">
          <div className="pl-5 pr-3 text-ink-2 group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories, entities, agents…"
            className="flex-1 bg-transparent py-4 px-2 text-[15px] text-ink placeholder-ink-5 focus:outline-none"
          />
          <motion.button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-primary hover:bg-primary/90 text-white m-2 px-6 py-2.5 rounded-lg text-[13px] font-bold tracking-wider uppercase disabled:opacity-40 shadow-glow-blue transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </motion.button>
        </div>
      </motion.form>

      {/* Results */}
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {!hasSearched ? (
            /* Idle state */
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <Sparkles size={32} className="text-ink-5 mx-auto mb-4" />
              <p className="text-[15px] text-ink-5">
                Enter a query to explore the neural memory graph.
              </p>
            </motion.div>
          ) : loading ? (
            /* Loading skeleton */
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl p-6 mb-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-6 w-20 rounded-full bg-white/10" />
                    <div className="h-5 w-28 rounded bg-white/10" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 rounded bg-white/10" />
                    <div className="h-4 w-4/5 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : results.length === 0 ? (
            /* No results */
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl p-14 text-center"
            >
              <Brain size={28} className="text-ink-5 mx-auto mb-3" />
              <p className="text-[15px] font-medium text-ink-2">No memories found for "{query}"</p>
              <p className="text-[13px] text-ink-5 mt-1">Try a different search term.</p>
            </motion.div>
          ) : (
            /* Results grid */
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-ink-2 font-medium">
                  {results.length} memory {results.length === 1 ? 'node' : 'nodes'} found
                </span>
                <button
                  onClick={() => { setResults([]); setSearched(false); setQuery(''); }}
                  className="text-[12px] text-ink-2 hover:text-ink flex items-center gap-1 transition-colors"
                >
                  <X size={12} /> Clear
                </button>
              </div>

              {results.map((res) => (
                <motion.div
                  key={res.memory_event_id}
                  variants={cardVariants}
                  className="glass rounded-2xl p-6 group hover:border-primary/25 transition-all duration-300"
                  whileHover={{ y: -2 }}
                >
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary uppercase tracking-wider">
                        {res.agent_role}
                      </span>
                      <span className="text-[11px] font-mono text-ink-5 bg-canvas-1 px-2 py-1 rounded-lg border border-border">
                        Run: {res.swarm_run_id.slice(0, 8)}…
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] uppercase tracking-widest text-ink-5">Score</span>
                      <span className={`text-[12px] font-bold rounded-lg border px-2.5 py-1 tabular-nums ${scoreColor(res.effective_score)}`}>
                        {res.effective_score.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-[14px] text-ink-2 leading-relaxed mb-5 group-hover:text-ink-2 transition-colors line-clamp-3">
                    {res.content}
                  </p>

                  {/* Entity pills */}
                  {res.entities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {res.entities.map((ent, idx) => (
                        <motion.button
                          key={idx}
                          onClick={() => handleInspectEntity(ent)}
                          className="rounded-pill border border-border bg-canvas-1 px-3 py-1 text-[11px] font-medium text-ink-2 hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                        >
                          #{ent}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Entity modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
            onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setNode(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md glass-md rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-2">Entity Graph</span>
                  <h3 className="text-[15px] font-bold text-primary mt-0.5">#{selectedNode}</h3>
                </div>
                <motion.button
                  onClick={() => setNode(null)}
                  className="p-2 rounded-xl text-ink-2 hover:text-ruby hover:bg-ruby/10 transition-all"
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={16} />
                </motion.button>
              </div>
              <div className="p-6">
                <p className="text-[13px] text-ink-2 mb-4">Linked agent nodes (2° separation)</p>
                {graphPaths.length === 0 ? (
                  <div className="text-center py-8 text-[14px] text-ink-5">
                    No linked nodes found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {graphPaths.map((path, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-canvas-1 border border-border"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary shadow-glow-blue flex-shrink-0" />
                        <span className="text-[13px] font-mono text-ink-2">
                          Degree {i + 1}: <span className="text-ink">{path}</span>
                        </span>
                      </motion.div>
                    ))}
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
