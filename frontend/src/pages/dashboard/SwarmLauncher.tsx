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
      await api.post('/swarms/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 50;
          setUploadProgress(percent);
        }
      });
      
      setMessage('Audio uploaded successfully. Transcription queued. Once complete, you will see a new active swarm trace.');
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
    <div className="w-full max-w-3xl mx-auto py-12 px-6">
      <div className="rounded-2xl border border-edge-default bg-surface-elevated/60 backdrop-blur-2xl p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
        {/* Subtle inner glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        <h2 className="text-3xl font-light tracking-tight text-white mb-8 flex items-center">
          <span className="text-primary mr-3">⚡</span> Launch Swarm
        </h2>
        
        {error && (
          <div className="mb-4 rounded-[8px] bg-accent-ruby/20 border border-accent-ruby p-3 text-[15px] text-canvas">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 rounded-[8px] bg-primary-soft/20 border border-primary p-3 text-[15px] text-primary">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2 uppercase tracking-wider">Select Agent Crew</label>
            <div className="relative">
              <select
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                className="w-full appearance-none rounded-xl border border-hairline-input bg-surface p-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
              >
                {crews.map((c) => (
                  <option key={c.id} value={c.id} className="bg-brand-dark-900 text-white">{c.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2 uppercase tracking-wider">Objective</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Describe the exact goal you want the swarm to accomplish..."
              maxLength={2000}
              rows={5}
              className="w-full rounded-xl border border-hairline-input bg-surface p-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner placeholder:text-ink-mute/50 resize-none text-[15px]"
            />
            <div className="flex justify-between mt-2 text-xs text-ink-mute font-medium">
              <span>Be as specific as possible.</span>
              <span className={objective.length > 1900 ? 'text-ruby' : ''}>{objective.length}/2000 characters</span>
            </div>
          </div>

          {/* Audio recording widgets */}
          <div className="rounded-xl border border-hairline-input bg-surface/30 p-5 flex items-center justify-between transition-all hover:bg-surface">
            <div className="text-sm text-ink-secondary font-medium">
              {recording ? 'Listening to your objective...' : 'Or speak your objective'}
              {uploadProgress !== null && <div className="mt-1 text-xs text-primary animate-pulse">Transcribing: {uploadProgress}%</div>}
            </div>
            
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="h-12 w-12 bg-ruby rounded-full flex items-center justify-center text-white animate-pulse shadow-[0_0_20px_rgba(234,34,97,0.6)] hover:bg-ruby/80 transition-all"
              >
                ■
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={loading}
                className="h-12 w-12 bg-surface-elevated border border-primary/50 rounded-full flex items-center justify-center text-primary hover:bg-primary/20 hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !objective.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-deep p-4 text-[16px] font-bold tracking-wide text-white transition-all hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] disabled:opacity-50 disabled:hover:shadow-none hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Deploying Swarm...
              </div>
            ) : 'Launch Swarm'}
          </button>
        </form>
      </div>
    </div>
  );
};
