import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSwarmStore } from '../../stores/useSwarmStore';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mic, MicOff, ChevronDown, ArrowRight } from 'lucide-react';

interface CrewOption { id: string; name: string; }

export const SwarmLauncher: React.FC = () => {
  const [crews, setCrews]               = useState<CrewOption[]>([]);
  const [selectedCrew, setSelectedCrew] = useState('');
  const [objective, setObjective]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [recording, setRecording]       = useState(false);
  const [mediaRecorder, setMR]          = useState<MediaRecorder | null>(null);
  const navigate      = useNavigate();
  const setActiveSwarm = useSwarmStore((s) => s.setActiveSwarm);
  const clearStore    = useSwarmStore((s) => s.clearStore);

  useEffect(() => {
    api.get<CrewOption[]>('/crews')
      .then((r) => { setCrews(r.data); if (r.data.length) setSelectedCrew(r.data[0].id); })
      .catch(() => {});
  }, []);

  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await uploadVoice(blob);
      };
      setMR(recorder);
      recorder.start();
      setRecording(true);
    } catch {
      toast.error('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const uploadVoice = async (blob: Blob) => {
    setLoading(true);
    const fd = new FormData();
    fd.append('audio', blob, 'recording.webm');
    try {
      const res = await api.post('/swarms/voice', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const id = res.data.swarm_run_id;
      if (id) { setActiveSwarm(id); navigate(`/dashboard/trace/${id}`); }
      else toast.success('Audio queued for transcription.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Voice upload failed.');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;
    setLoading(true);
    clearStore();
    const toastId = toast.loading('Launching swarm...');
    try {
      const res = await api.post('/swarms', { crew_id: selectedCrew, objective: objective.trim() });
      const id  = res.data.swarm_run_id;
      setActiveSwarm(id);
      toast.success('Swarm launched!', { id: toastId });
      navigate(`/dashboard/trace/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Launch failed.', { id: toastId });
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {/* Centered Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <div className="mb-6 text-center">
          <h1 className="font-display font-black text-[36px] text-white leading-tight uppercase tracking-wide">
            Launch New Swarm Run
          </h1>
          <p className="mt-2 text-[14px] text-ink-4 leading-relaxed font-light max-w-lg mx-auto">
            Configure mission parameters and select your agent crew to initiate a coordinated multi-agent task execution.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-[#0a0a0c] p-8 rounded-2xl border border-white/5 shadow-2xl">
          {/* Crew Selector */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-ink-5 mb-1.5">
              Select Agent Crew
            </label>
            <div className="relative">
              <select
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                className="w-full appearance-none bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-[13px] text-white cursor-pointer focus:outline-none focus:border-primary/50 transition-colors"
              >
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {crews.length === 0 && (
                  <option value="">No crews configured</option>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-5 pointer-events-none" />
            </div>
          </div>

          {/* Objective Textarea */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-ink-5">
                Mission Objective
              </label>
              <span className="text-[10px] text-ink-5 tabular-nums">
                {objective.length}/2000
              </span>
            </div>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Describe the task in detail."
              maxLength={2000}
              rows={3}
              className="w-full resize-none bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-ink-6 focus:outline-none focus:border-primary/50 transition-colors leading-relaxed"
            />
          </div>

          {/* Voice Input */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0a0a0c] px-3 text-[9px] font-bold tracking-[0.2em] uppercase text-ink-6">
                Or Use Voice
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            {recording ? (
              <motion.button
                type="button"
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-ruby flex items-center justify-center text-white shadow-glow-ruby"
                animate={{ boxShadow: ['0 0 20px rgba(225,29,72,0.4)', '0 0 40px rgba(225,29,72,0.7)', '0 0 20px rgba(225,29,72,0.4)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <MicOff size={18} />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={loading}
                className="w-12 h-12 rounded-full bg-[#050505] border border-white/10 flex items-center justify-center text-primary hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50"
              >
                <Mic size={18} />
              </button>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !objective.trim()}
            className="w-full bg-primary hover:bg-blue-500 text-white rounded-xl py-3 flex items-center justify-center gap-2 text-[12px] font-bold tracking-widest uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-blue"
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initializing...
              </span>
            ) : (
              <>
                Launch Swarm
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
