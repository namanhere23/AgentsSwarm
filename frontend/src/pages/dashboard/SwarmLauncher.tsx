// NEW — Implemented by: workstream/3c-dashboard-trace
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSwarmStore } from '../../stores/useSwarmStore';

interface CrewOption {
  id: string;
  name: string;
}

export const SwarmLauncher: React.FC = () => {
  const [crews, setCrews] = useState<CrewOption[]>([]);
  const [selectedCrew, setSelectedCrew] = useState('');
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const setActiveSwarm = useSwarmStore((state) => state.setActiveSwarm);
  const clearStore = useSwarmStore((state) => state.clearStore);

  useEffect(() => {
    // Fetch registered YAML crews
    const fetchCrews = async () => {
      try {
        const res = await api.get<CrewOption[]>('/crews');
        setCrews(res.data);
        if (res.data.length > 0) {
          setSelectedCrew(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load crews configuration templates', err);
      }
    };
    fetchCrews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;

    setLoading(true);
    setError(null);
    clearStore();

    try {
      const res = await api.post('/swarms', {
        crew_id: selectedCrew,
        objective: objective.trim()
      });
      
      const swarmId = res.data.swarm_run_id;
      setActiveSwarm(swarmId);
      navigate(`/dashboard/trace/${swarmId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit swarm trigger.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="rounded-[12px] border border-dark-border bg-dark-card p-[32px] shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
        <h2 className="text-[32px] font-light tracking-[-0.64px] text-canvas mb-6">Launch New Swarm Run</h2>
        
        {error && (
          <div className="mb-4 rounded-[8px] bg-accent-ruby/20 border border-accent-ruby p-3 text-[15px] text-canvas">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[15px] font-light text-ink-mute mb-2">Select Agent Swarm Crew:</label>
            <select
              value={selectedCrew}
              onChange={(e) => setSelectedCrew(e.target.value)}
              className="w-full rounded-[6px] border border-hairline-input bg-canvas p-[8px_12px] text-ink focus:outline-none focus:border-primary"
            >
              {crews.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[15px] font-light text-ink-mute mb-2">Objective Text:</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What goal should the agent crew accomplish?"
              maxLength={2000}
              rows={5}
              className="w-full rounded-[6px] border border-hairline-input bg-canvas p-[8px_12px] text-ink focus:outline-none focus:border-primary placeholder:text-ink-mute resize-none text-[15px] font-light"
            />
            <div className="flex justify-between mt-1 text-[13px] text-ink-mute font-normal tabular-nums-money">
              <span>Limit execution actions where possible.</span>
              <span>{objective.length}/2000 characters</span>
            </div>
          </div>

          {/* Extension point for Voice recording widget (Phase 6A) goes here */}

          <button
            type="submit"
            disabled={loading || !objective.trim()}
            className="w-full rounded-full bg-primary p-[8px_16px] text-[16px] font-normal text-on-primary transition-all hover:bg-primary-press hover:shadow-lg disabled:opacity-50 active:scale-95 flex items-center justify-center"
          >
            {loading ? 'Queueing swarm...' : 'Launch Swarm'}
          </button>
        </form>
      </div>
    </div>
  );
};
