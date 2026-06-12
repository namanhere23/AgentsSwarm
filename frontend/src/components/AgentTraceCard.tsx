// NEW — Implemented by: workstream/3c-dashboard-trace
import React, { useState } from 'react';
import { TaskTrace } from '../types/swarm';

interface Props {
  task: TaskTrace;
}

export const AgentTraceCard: React.FC<Props> = ({ task }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="w-full rounded-[12px] border border-dark-border bg-dark-card overflow-hidden shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
      <div 
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-dark-border/40 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${task.status === 'running' ? 'bg-accent-lemon animate-pulse' : 'bg-emerald-500'}`} />
          <h3 className="text-[18px] font-light text-ink tracking-tight">{task.agent}</h3>
        </div>
        <span className="text-[11px] text-ink-mute font-normal uppercase tracking-wider">{task.status}</span>
      </div>

      {!collapsed && (
        <div className="border-t border-dark-border/55 p-6 space-y-4 bg-dark-bg/20 text-[15px]">
          {task.thought && (
            <div>
              <h4 className="text-[10px] font-normal text-primary-soft uppercase tracking-[0.1px] mb-1">Thought:</h4>
              <p className="text-ink-secondary leading-relaxed font-light whitespace-pre-wrap">{task.thought}</p>
            </div>
          )}
          {task.action && (
            <div>
              <h4 className="text-[10px] font-normal text-accent-lemon uppercase tracking-[0.1px] mb-1">Action:</h4>
              <pre className="bg-dark-bg p-3 rounded-[6px] overflow-x-auto border border-dark-border text-[13px] text-canvas-cream tabular-nums-money">
                {task.action}
              </pre>
            </div>
          )}
          {task.observation && (
            <div>
              <h4 className="text-[10px] font-normal text-emerald-400 uppercase tracking-[0.1px] mb-1">Observation:</h4>
              <p className="text-ink-secondary leading-relaxed font-light whitespace-pre-wrap font-mono text-[13px]">{task.observation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
