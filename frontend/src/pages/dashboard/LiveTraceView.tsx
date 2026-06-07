// NEW — Implemented by: workstream/3c-dashboard-trace
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSwarmStore } from '../../stores/useSwarmStore';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { AgentTraceCard } from '../../components/AgentTraceCard';

export const LiveTraceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((state) => state.token);
  const tasks = useSwarmStore((state) => state.tasks);
  const swarmStatus = useSwarmStore((state) => state.swarmStatus);
  
  const connect = useWebSocketStore((state) => state.connect);
  const disconnect = useWebSocketStore((state) => state.disconnect);

  useEffect(() => {
    if (id && token) {
      connect(id, token);
    }
    return () => {
      disconnect();
    };
  }, [id, token, connect, disconnect]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressRatio = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-[32px] font-light text-canvas tracking-[-0.64px]">Swarm Run: <span className="tabular-nums-money">{id?.slice(0, 8)}...</span></h2>
          <p className="text-[14px] text-ink-mute mt-1 font-light">
            Status: <span className="capitalize font-normal text-primary-soft">{swarmStatus}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {swarmStatus === 'completed' && (
            <a 
              href={`/api/swarms/${id}/report`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-600 p-[8px_16px] text-[16px] font-normal text-canvas hover:bg-emerald-500 transition-all flex justify-center items-center"
            >
              View Report
            </a>
          )}
          <Link to="/dashboard" className="rounded-[6px] border border-dark-border p-[8px_16px] text-[15px] font-light text-canvas hover:bg-dark-border/40 transition-all flex justify-center items-center">
            Back
          </Link>
        </div>
      </div>

      {/* Progress timeline bar */}
      <div className="w-full bg-dark-card border border-dark-border rounded-[12px] p-6 mb-6 shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
        <div className="flex justify-between text-[13px] text-ink-mute font-normal mb-2 tabular-nums-money">
          <span>Task Progress Checklist</span>
          <span>{completedCount} / {tasks.length} tasks completed</span>
        </div>
        <div className="w-full h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progressRatio}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-ink-mute font-light text-[15px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-ink-mute mx-auto mb-4" />
            Waiting for events from agent coordinator events queue...
          </div>
        ) : (
          tasks.map((task) => (
            <AgentTraceCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
};
