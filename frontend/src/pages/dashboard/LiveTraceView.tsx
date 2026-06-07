// NEW — Implemented by: workstream/3c-dashboard-trace
import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useSwarmStore } from '../../stores/useSwarmStore';
import { useWebSocketStore } from '../../stores/useWebSocketStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { AgentTraceCard } from '../../components/AgentTraceCard';

export const LiveTraceView: React.FC = () => {
  const { runId } = useParams<{ runId?: string }>();
  const token = useAuthStore((state) => state.token);
  const activeSwarmId = useSwarmStore((state) => state.activeSwarmId);
  const tasks = useSwarmStore((state) => state.tasks);
  const swarmStatus = useSwarmStore((state) => state.swarmStatus);
  const briefingUrl = useSwarmStore((state) => state.briefingUrl);
  const setActiveSwarm = useSwarmStore((state) => state.setActiveSwarm);
  const setSwarmStatus = useSwarmStore((state) => state.setSwarmStatus);
  const clearStore = useSwarmStore((state) => state.clearStore);

  const connect = useWebSocketStore((state) => state.connect);
  const disconnect = useWebSocketStore((state) => state.disconnect);
  const effectiveRunId = runId ?? activeSwarmId;
  const previousRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!effectiveRunId) {
      return;
    }

    if (previousRunIdRef.current !== effectiveRunId) {
      clearStore();
      setActiveSwarm(effectiveRunId);
      previousRunIdRef.current = effectiveRunId;
    }
  }, [clearStore, effectiveRunId, setActiveSwarm]);

  useEffect(() => {
    if (effectiveRunId && token) {
      connect(effectiveRunId, token);
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, effectiveRunId, token]);

  useEffect(() => {
    if (!effectiveRunId) {
      return;
    }

    let cancelled = false;
    const syncRunStatus = async () => {
      try {
        const res = await api.get(`/swarms/${effectiveRunId}`);
        if (!cancelled) {
          setSwarmStatus(res.data.status);
        }
      } catch (err) {
        console.error('Failed to hydrate swarm run status', err);
      }
    };

    void syncRunStatus();
    const interval = window.setInterval(() => {
      void syncRunStatus();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [effectiveRunId, setSwarmStatus]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressRatio = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  if (!effectiveRunId) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="rounded-[12px] border border-dark-border bg-dark-card p-8 text-center text-ink-mute">
          Launch a swarm from the Swarm Launcher to open its Live Trace, or select an active run first.
        </div>
      </div>
    );
  }

  const emptyStateMessage =
    swarmStatus === 'failed'
      ? 'This run failed before a complete trace could be rendered.'
      : swarmStatus === 'completed'
        ? 'This run completed, but no detailed task events were captured for it.'
        : 'Waiting for events from the agent coordinator queue...';

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-[32px] font-light text-canvas tracking-[-0.64px]">Swarm Run: <span className="tabular-nums-money">{effectiveRunId.slice(0, 8)}...</span></h2>
          <p className="text-[14px] text-ink-mute mt-1 font-light">
            Status: <span className="capitalize font-normal text-primary-soft">{swarmStatus}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {swarmStatus === 'completed' && (
            <a
              href={`/api/swarms/${effectiveRunId}/report`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-600 p-[8px_16px] text-[16px] font-normal text-canvas hover:bg-emerald-500 transition-all flex justify-center items-center"
            >
              View Report
            </a>
          )}
          {briefingUrl && (
            <a
              href={briefingUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-primary/20 p-[8px_16px] text-[16px] font-normal text-primary hover:bg-primary/30 transition-all flex justify-center items-center"
            >
              Briefing Audio
            </a>
          )}
          <Link to="/dashboard" className="rounded-[6px] border border-dark-border p-[8px_16px] text-[15px] font-light text-canvas hover:bg-dark-border/40 transition-all flex justify-center items-center">
            Back
          </Link>
        </div>
      </div>

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
            {swarmStatus !== 'completed' && swarmStatus !== 'failed' && (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-ink-mute mx-auto mb-4" />
            )}
            {emptyStateMessage}
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
