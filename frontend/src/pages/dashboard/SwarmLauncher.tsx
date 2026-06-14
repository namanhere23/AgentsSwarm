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
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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

  const startRecording = async () => {
    setError(null);
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await uploadVoice(audioBlob);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone Access Denied. Verify device permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const uploadVoice = async (blob: Blob) => {
    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    try {
      const res = await api.post('/swarms/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 50;
          setUploadProgress(percent);
        }
      });
      
      const swarmId = res.data.swarm_run_id;
      if (swarmId) {
        setActiveSwarm(swarmId);
        navigate(`/dashboard/trace/${swarmId}`);
      } else {
        setMessage('Audio uploaded successfully. Transcription queued.');
      }
      setUploadProgress(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Voice upload failed.');
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="glass-panel p-[32px] relative overflow-hidden">
        {/* Subtle background glow specific to this card */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-magenta/10 rounded-full blur-[80px] -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <h2 className="text-[32px] font-light tracking-[-0.64px] text-ink mb-6">Launch New Swarm Run</h2>
        
        {error && (
          <div className="mb-4 rounded-[8px] bg-ruby/10 border border-ruby/30 p-3 text-[15px] text-ruby backdrop-blur-sm">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 rounded-[8px] bg-primary-soft/10 border border-primary/30 p-3 text-[15px] text-primary backdrop-blur-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="block text-[14px] font-semibold tracking-wide text-ink/80 uppercase">Select Agent Swarm Crew:</label>
            <div className="relative">
              <select
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                className="w-full appearance-none bg-canvas-soft/60 border border-hairline-input focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-xl px-4 py-3.5 text-ink outline-none transition-all duration-300 shadow-inner cursor-pointer"
              >
                {crews.map((c) => (
                  <option key={c.id} value={c.id} className="bg-canvas text-ink">{c.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-ink-mute">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[14px] font-semibold tracking-wide text-ink/80 uppercase">Objective Text:</label>
            <textarea
              autoFocus
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What goal should the agent crew accomplish?"
              maxLength={2000}
              rows={5}
              className="w-full resize-none bg-canvas-soft/60 border border-hairline-input focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-xl px-4 py-3.5 text-ink placeholder:text-ink-mute/40 outline-none transition-all duration-300 shadow-inner"
            />
            <div className="flex justify-between mt-2 text-[12px] text-ink-mute/80 font-medium px-1">
              <span>Limit execution actions where possible.</span>
              <span className={objective.length > 1900 ? "text-ruby" : ""}>{objective.length} / 2000 chars</span>
            </div>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-hairline/50"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-canvas-soft text-[12px] text-ink-mute uppercase tracking-widest font-semibold rounded-full border border-hairline/50">OR USE VOICE</span>
            </div>
          </div>

          {/* Dedicated Audio Widget */}
          <div className={`relative overflow-hidden rounded-2xl border transition-all duration-500 p-6 flex flex-col items-center justify-center gap-4 ${
            recording 
              ? 'bg-ruby/5 border-ruby/40 shadow-[0_0_30px_rgba(225,29,72,0.15)]' 
              : 'bg-canvas-soft/40 border-hairline-input hover:border-primary/40 hover:bg-canvas-soft/60'
          }`}>
            {recording && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                <div className="absolute -inset-[100%] bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.15)_0%,transparent_50%)] animate-[spin_4s_linear_infinite]"></div>
              </div>
            )}
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              {recording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="h-16 w-16 bg-ruby border-2 border-ruby/50 rounded-full flex items-center justify-center text-white animate-pulse shadow-[0_0_25px_rgba(225,29,72,0.6)] transition-transform hover:scale-110 active:scale-95"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading}
                  className="h-16 w-16 bg-canvas border border-hairline-input rounded-full flex items-center justify-center text-primary transition-all duration-300 hover:bg-primary hover:text-white hover:border-primary hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] disabled:opacity-50 group hover:-translate-y-1"
                >
                  <svg className="w-7 h-7 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                </button>
              )}
              
              <div className="text-center">
                {recording ? (
                  <span className="text-ruby font-medium flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ruby opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ruby"></span>
                    </span>
                    Listening to objective...
                  </span>
                ) : (
                  <span className="text-ink-mute text-sm">Click mic to record instructions</span>
                )}
                {uploadProgress !== null && <div className="mt-1 text-xs font-bold tracking-wide text-primary uppercase">Uploading: {uploadProgress}%</div>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !objective.trim()}
            className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-deep p-4 text-[16px] font-bold tracking-widest uppercase text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 active:scale-[0.98] flex items-center justify-center group"
          >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
            
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : (
                <>
                  Launch Swarm
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </>
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
