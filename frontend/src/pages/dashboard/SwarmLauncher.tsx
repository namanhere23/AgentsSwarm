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
    <div className="max-w-2xl mx-auto py-8">
      <div className="rounded-[12px] border border-dark-border bg-dark-card p-[32px] shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px]">
        <h2 className="text-[32px] font-light tracking-[-0.64px] text-canvas mb-6">Launch New Swarm Run</h2>
        
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

          {/* Audio recording widgets */}
          <div className="rounded-[8px] border border-hairline-input bg-canvas-soft p-[16px] flex items-center justify-between">
            <div className="text-[14px] text-ink-mute font-light">
              {recording ? 'Recording voice objective...' : 'Or use voice recognition triggers'}
              {uploadProgress !== null && <div className="mt-1 font-normal text-primary">Uploading: {uploadProgress}%</div>}
            </div>
            
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="h-10 w-10 bg-ruby rounded-full flex items-center justify-center text-on-primary animate-pulse shadow-md"
              >
                ■
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={loading}
                className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-on-primary hover:bg-primary-press shadow-md disabled:opacity-50"
              >
                🎙
              </button>
            )}
          </div>

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
