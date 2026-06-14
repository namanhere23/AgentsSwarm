import React, { useState } from 'react';
import { TaskTrace } from '../types/swarm';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props { task: TaskTrace; }

const STATUS_CONFIG = {
  completed: { border: '#10b981', dot: 'bg-emerald', badge: 'border-emerald/25 text-emerald bg-emerald/10', label: 'Completed' },
  running:   { border: '#3b82f6', dot: 'bg-primary animate-pulse', badge: 'border-primary/25 text-primary bg-primary/10', label: 'Running'   },
  pending:   { border: '#475569', dot: 'bg-ink-4', badge: 'border-border text-ink-2 bg-white/[0.03]', label: 'Pending'   },
  failed:    { border: '#e11d48', dot: 'bg-ruby',   badge: 'border-ruby/25 text-ruby bg-ruby/10',   label: 'Failed'    },
};

export const AgentTraceCard: React.FC<Props> = ({ task }) => {
  const [expanded, setExpanded] = useState(task.status === 'running' || task.status === 'completed');
  const config = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const hasContent = task.thought || task.action || task.observation;

  return (
    <div
      className="glass rounded-2xl overflow-hidden transition-all duration-300 hover:border-border-md"
      style={{ borderLeft: `3px solid ${config.border}` }}
    >
      {/* Header row */}
      <motion.button
        onClick={() => hasContent && setExpanded((e) => !e)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left ${hasContent ? 'cursor-pointer hover:bg-white/[0.025]' : 'cursor-default'} transition-colors`}
        whileTap={hasContent ? { scale: 0.99 } : undefined}
      >
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            {task.status === 'running' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
          </span>

          <div>
            <span className="text-[14px] font-semibold text-ink">
              {task.agent_role || task.agent}
            </span>
            {task.id && (
              <span className="ml-2 text-[11px] font-mono text-ink-5">#{task.id.slice(0, 6)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase ${config.badge}`}>
            {config.label}
          </span>
          {hasContent && (
            <span className="text-ink-5">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          )}
        </div>
      </motion.button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && hasContent && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-5 space-y-4 bg-black/20">
              {task.thought && (
                <div>
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2">
                    Thought
                  </div>
                  <p className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap">
                    {task.thought}
                  </p>
                </div>
              )}
              {task.action && (
                <div>
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber mb-2">
                    Action
                  </div>
                  <pre className="bg-canvas rounded-xl border border-border px-4 py-3 text-[12px] text-ink-2 font-mono overflow-x-auto leading-relaxed">
                    {task.action}
                  </pre>
                </div>
              )}
              {task.observation && (
                <div>
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald mb-2">
                    Observation
                  </div>
                  <p className="text-[13px] text-ink-2 font-mono leading-relaxed whitespace-pre-wrap">
                    {task.observation}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
