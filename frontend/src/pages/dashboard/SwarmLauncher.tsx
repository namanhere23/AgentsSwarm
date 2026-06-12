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
          <div>
            <label className="block text-[15px] font-light text-ink-mute mb-2">Select Agent Swarm Crew:</label>
            <select
              value={selectedCrew}
              onChange={(e) => setSelectedCrew(e.target.value)}
              className="text-input w-full appearance-none bg-canvas-soft/40 hover:bg-canvas-soft/60 cursor-pointer"
            >
              {crews.map((c) => (
                <option key={c.id} value={c.id} className="bg-canvas text-ink">{c.name}</option>
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
              className="text-input w-full resize-none placeholder:text-ink-mute/50 bg-canvas-soft/40 hover:bg-canvas-soft/60"
            />
            <div className="flex justify-between mt-2 text-[13px] text-ink-mute font-normal tabular-nums-money">
              <span>Limit execution actions where possible.</span>
              <span>{objective.length}/2000 characters</span>
            </div>
          </div>

          {/* Audio recording widgets */}
          <div className="rounded-[12px] border border-hairline-input bg-canvas-soft/30 p-[16px] flex items-center justify-between backdrop-blur-sm transition-all duration-300 hover:bg-canvas-soft/50 hover:border-primary/50">
            <div className="text-[14px] text-ink font-light">
              {recording ? (
                <span className="text-ruby animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ruby"></div> Recording voice objective...
                </span>
              ) : 'Or use voice recognition triggers'}
              {uploadProgress !== null && <div className="mt-1 font-normal text-primary">Uploading: {uploadProgress}%</div>}
            </div>
            
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="h-10 w-10 bg-ruby/20 border border-ruby rounded-full flex items-center justify-center text-ruby animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.4)]"
              >
                ■
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={loading}
                className="h-10 w-10 bg-primary/20 border border-primary rounded-full flex items-center justify-center text-primary transition-all duration-300 hover:bg-primary hover:text-on-primary hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !objective.trim()}
            className="w-full rounded-full bg-primary p-[12px_16px] text-[16px] font-medium tracking-wide text-on-primary transition-all duration-300 hover:bg-primary-soft hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] disabled:opacity-50 active:scale-[0.98] flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Queueing swarm...
              </span>
            ) : 'Launch Swarm'}
          </button>
        </form>
      </div>
    </div>
  );
};
