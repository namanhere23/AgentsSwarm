// NEW — Implemented by: workstream/3c-dashboard-trace
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface HealthData {
  status: string;
  components: Record<string, 'up' | 'down'>;
  rate_limits: {
    gemini_tokens_used_today: number;
    groq_requests_used_today: number;
    serper_searches_used_month: number;
  };
}

export const SystemStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    try {
      const res = await api.get<HealthData>('/health');
      setHealth(res.data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center text-ink-mute font-light text-[15px] py-8">Fetching health stats...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[48px] font-light text-canvas tracking-[-0.96px]">Subsystem Observability</h2>
        <span className={`rounded-full px-[8px] py-[4px] text-[10px] font-normal uppercase tracking-[0.1px] ${health?.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-accent-ruby/20 text-accent-ruby'}`}>
          Overall status: {health?.status || 'unreachable'}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Subsystem grid status */}
        <div className="rounded-[12px] border border-dark-border bg-dark-card p-[32px] shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
          <h3 className="text-[22px] font-light text-canvas tracking-[-0.22px] mb-4">Infrastructure health</h3>
          <div className="space-y-3">
            {health?.components ? (
              Object.entries(health.components).map(([name, status]) => (
                <div key={name} className="flex justify-between items-center border-b border-dark-border/40 pb-2">
                  <span className="capitalize text-[15px] font-light text-ink-mute">{name.replace('_', ' ')}</span>
                  <span className={`text-[11px] font-normal uppercase ${status === 'up' ? 'text-emerald-400' : 'text-accent-ruby'}`}>
                    {status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-accent-ruby text-[14px] font-light">FastAPI coordinates offline or degraded. Check logs.</div>
            )}
          </div>
        </div>

        {/* Rate Limits visualizer */}
        <div className="rounded-[12px] border border-dark-border bg-dark-card p-[32px] shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
          <h3 className="text-[22px] font-light text-canvas tracking-[-0.22px] mb-4">Quotas Headroom</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[13px] text-ink-mute font-normal mb-1 tabular-nums-money">
                <span>Gemini Tokens (1M free limit)</span>
                <span>{health?.rate_limits.gemini_tokens_used_today || 0} / 1,000,000</span>
              </div>
              <div className="w-full bg-dark-bg h-2 rounded-full overflow-hidden border border-dark-border">
                <div className="bg-primary h-full" style={{ width: `${Math.min(100, ((health?.rate_limits.gemini_tokens_used_today || 0) / 1000000) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] text-ink-mute font-normal mb-1 tabular-nums-money">
                <span>Groq API requests (14.4k daily)</span>
                <span>{health?.rate_limits.groq_requests_used_today || 0} / 14,400</span>
              </div>
              <div className="w-full bg-dark-bg h-2 rounded-full overflow-hidden border border-dark-border">
                <div className="bg-accent-lemon h-full" style={{ width: `${Math.min(100, ((health?.rate_limits.groq_requests_used_today || 0) / 14400) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
