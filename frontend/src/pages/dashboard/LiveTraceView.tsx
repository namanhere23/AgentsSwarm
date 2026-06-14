import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSwarmStore } from '../../stores/useSwarmStore';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { AgentTraceCard } from '../../components/AgentTraceCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, Cpu, CheckCircle2 } from 'lucide-react';

const statusConfig: Record<string, { color: string; glow: string; label: string }> = {
  running:   { color: 'text-primary bg-primary/10 border-primary/25',   glow: 'shadow-glow-blue',    label: 'Running'   },
  completed: { color: 'text-emerald bg-emerald/10 border-emerald/25',   glow: 'shadow-glow-emerald', label: 'Completed' },
  failed:    { color: 'text-ruby bg-ruby/10 border-ruby/25',            glow: 'shadow-glow-ruby',    label: 'Failed'    },
  pending:   { color: 'text-amber bg-amber/10 border-amber/25',         glow: 'shadow-glow-amber',   label: 'Pending'   },
};

export const LiveTraceView: React.FC = () => {
  const { runId: id }  = useParams<{ runId: string }>();
  const token          = useAuthStore((s) => s.token);
  const tasks          = useSwarmStore((s) => s.tasks);
  const swarmStatus    = useSwarmStore((s) => s.swarmStatus);
  const finalOutput    = useSwarmStore((s) => s.finalOutput);
  const connect        = useWebSocketStore((s) => s.connect);
  const disconnect     = useWebSocketStore((s) => s.disconnect);
  const clearStore     = useSwarmStore((s) => s.clearStore);

  useEffect(() => {
    clearStore();
    if (id) connect(id, token);
    return () => { disconnect(); };
  }, [id, token, connect, disconnect, clearStore]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressRatio  = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const status         = statusConfig[swarmStatus] ?? statusConfig.running;

  return (
    <div className="page-content">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-bold text-[28px] text-ink tracking-tight">
              Swarm Run
            </h1>
            <span className="font-mono text-[15px] text-ink-4">{id?.slice(0, 8)}…</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold tracking-wider uppercase ${status.color} ${status.glow}`}
            >
              {swarmStatus === 'running' && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
              )}
              {status.label}
            </span>
            <span className="text-[13px] text-ink-4">
              {completedCount}/{tasks.length} tasks completed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {swarmStatus === 'completed' && (
            <motion.a
              href={`/api/swarms/${id}/report`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-emerald/25 bg-emerald/10 px-4 py-2.5 text-[13px] font-medium text-emerald hover:bg-emerald/20 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <FileText size={14} />
              View Report
            </motion.a>
          )}
          <Link
            to="/dashboard"
            className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        className="glass rounded-2xl p-6 mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.1em] uppercase text-ink-4">
            <Cpu size={13} />
            Task Progress
          </div>
          <span className="text-[13px] font-medium tabular-nums text-ink-3">
            {completedCount} / {tasks.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-[5px] bg-canvas-1 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #3b82f6, #d946ef)' }}
            initial={{ width: '0%' }}
            animate={{ width: `${progressRatio}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Shimmer overlay on the filled bar */}
            {swarmStatus === 'running' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </motion.div>
        </div>

        {/* Mini task chips */}
        {tasks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tasks.map((task, i) => (
              <motion.span
                key={task.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  task.status === 'completed' ? 'border-emerald/25 text-emerald bg-emerald/10' :
                  task.status === 'running'   ? 'border-primary/25 text-primary bg-primary/10' :
                  'border-border text-ink-4 bg-white/[0.02]'
                }`}
              >
                {task.status === 'completed' && <CheckCircle2 size={10} />}
                {task.agent_role}
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Agent Trace Cards */}
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {tasks.length === 0 ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-border-md animate-spin" style={{ borderTopColor: '#3b82f6' }} />
                <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-[15px] text-ink-3 font-medium">Connecting to swarm coordinator…</p>
                <p className="text-[13px] text-ink-5 mt-1">Waiting for agent events</p>
              </div>
            </motion.div>
          ) : (
            tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <AgentTraceCard task={task} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Final Output */}
      <AnimatePresence>
        {swarmStatus === 'completed' && finalOutput && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 glass rounded-2xl p-6 border-primary/20"
            style={{ borderColor: 'rgba(59,130,246,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-emerald">
                Final Result
              </h3>
            </div>
            <pre className="bg-canvas-1 rounded-xl border border-border p-5 text-[13px] text-ink-2 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[400px]">
              {finalOutput}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
