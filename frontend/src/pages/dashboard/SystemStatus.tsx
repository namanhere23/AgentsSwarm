import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { motion, Variants } from 'framer-motion';
import { Activity, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface HealthData {
  status: string;
  components: Record<string, 'up' | 'down'>;
  rate_limits: {
    gemini_tokens_used_today: number;
    groq_requests_used_today: number;
    serper_searches_used_month: number;
  };
}

interface QuotaItem {
  label: string;
  used: number;
  limit: number;
  color: string;
}

const containerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } },
};

export const SystemStatus: React.FC = () => {
  const [health, setHealth]   = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get<HealthData>('/health');
      setHealth(res.data);
    } catch { setHealth(null); } finally {
      setLoading(false);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30000);
    return () => clearInterval(id);
  }, []);

  const quotas: QuotaItem[] = health ? [
    { label: 'Gemini Tokens (1M daily)', used: health.rate_limits.gemini_tokens_used_today, limit: 1_000_000, color: '#3b82f6' },
    { label: 'Groq API Requests (14.4k daily)', used: health.rate_limits.groq_requests_used_today, limit: 14_400, color: '#d946ef' },
    { label: 'Serper Searches (monthly)', used: health.rate_limits.serper_searches_used_month, limit: 2_500, color: '#06b6d4' },
  ] : [];

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="page-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="page-title">System Status</h1>
          <p className="text-[14px] text-ink-2 mt-2">
            Real-time health monitoring and quota observability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-bold tracking-wider uppercase ${
              loading ? 'border-border text-ink-2 bg-white/[0.03]' :
              isHealthy
                ? 'border-emerald/30 text-emerald bg-emerald/10 shadow-glow-emerald'
                : 'border-ruby/30 text-ruby bg-ruby/10 shadow-glow-ruby'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {!loading && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isHealthy ? 'bg-emerald' : 'bg-ruby'}`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? 'bg-ink-4 animate-pulse' : isHealthy ? 'bg-emerald' : 'bg-ruby'}`} />
            </span>
            {loading ? 'Checking…' : isHealthy ? 'Healthy' : health ? 'Degraded' : 'Offline'}
          </span>

          <motion.button
            onClick={checkHealth}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-medium disabled:opacity-50"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid md:grid-cols-2 gap-6"
      >
        {/* Infrastructure health */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Activity size={16} className="text-ink-2" />
            <h3 className="text-[13px] font-semibold tracking-[0.12em] uppercase text-ink-2">
              Infrastructure
            </h3>
          </div>

          {health?.components ? (
            <div className="space-y-2">
              {Object.entries(health.components).map(([name, status], i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-[14px] text-ink-2 capitalize font-medium">
                    {name.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {status === 'up' ? (
                      <CheckCircle2 size={15} className="text-emerald" />
                    ) : (
                      <XCircle size={15} className="text-ruby" />
                    )}
                    <span className={`text-[12px] font-bold uppercase tracking-widest ${status === 'up' ? 'text-emerald' : 'text-ruby'}`}>
                      {status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <XCircle size={28} className="text-ruby" />
              <div>
                <p className="text-[14px] font-medium text-ruby">Backend offline</p>
                <p className="text-[13px] text-ink-5 mt-1">Check FastAPI coordinator logs.</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quota headroom */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-4 h-4 rounded bg-gradient-brand" />
            <h3 className="text-[13px] font-semibold tracking-[0.12em] uppercase text-ink-2">
              API Quotas
            </h3>
          </div>

          <div className="space-y-5">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-40 bg-white/10 rounded" />
                    <div className="h-4 w-20 bg-white/10 rounded" />
                  </div>
                  <div className="h-2 bg-white/10 rounded-full" />
                </div>
              ))
            ) : (
              quotas.map(({ label, used, limit, color }, i) => {
                const pct = Math.min(100, (used / limit) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[13px] mb-2">
                      <span className="text-ink-2 font-medium">{label}</span>
                      <span className="text-ink-2 tabular-nums font-mono">
                        {used.toLocaleString()} / {limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-[5px] bg-canvas-1 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: i * 0.15, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[11px] text-ink-5 tabular-nums">
                        {pct.toFixed(1)}% used
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Last checked */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-5 text-[12px] text-ink-5 text-center"
      >
        Auto-refreshes every 30s · Last checked: {lastCheck.toLocaleTimeString()}
      </motion.p>
    </div>
  );
};
