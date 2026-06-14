// NEW — Implemented by: workstream/5b-crew-manager-rollback
import React, { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import api from '../../services/api';

export const CrewManager: React.FC = () => {
  const [crewId, setCrewId] = useState('');
  const [yamlCode, setYamlCode] = useState(`# Crew Definition YAML Template\nid: research-crew\nname: Research Crew\ndescription: Coordinated crew description\nprocess: hierarchical\nagents:\n  - role: orchestrator\n    tools: []\n`);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setErrors([]);
    setMessage(null);
    
    if (!crewId.trim()) {
      setErrors([{ field: 'crewId', message: 'Crew ID is required to save template files.' }]);
      return;
    }

    try {
      const res = await api.post(`/crews/${crewId.trim()}`, { yaml_content: yamlCode });
      if (res.data.status === 'saved') {
        setMessage('Crew saved and hot-reloaded successfully.');
      }
    } catch (err: unknown) {
      const response = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { status?: number; data?: { detail?: unknown } } }).response
        : undefined;
      if (response?.status === 400 && response.data?.detail) {
        // Handle validation errors list parsing
        const details = response.data.detail;
        if (typeof details === 'string' && details.includes('Validation failed:')) {
          // Extract errors string array
          try {
            const errStr = details.split('Validation failed: ')[1].replace(/'/g, '"');
            setErrors(JSON.parse(errStr));
          } catch {
            setErrors([{ field: 'schema', message: details }]);
          }
        } else if (typeof details === 'string') {
          setErrors([{ field: 'api', message: details }]);
        } else {
          setErrors([{ field: 'api', message: 'The server rejected the crew definition.' }]);
        }
      } else {
      } else {
        setErrors([{ field: 'server', message: 'Failed to write crew configuration template.' }]);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-[32px] font-light tracking-[-0.64px] text-white">Crew Configuration Manager</h2>
          <p className="text-gray-400 mt-1 text-sm">Define and manage agent roles, goals, and hierarchy via YAML.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative group">
            <input
              type="text"
              value={crewId}
              onChange={(e) => setCrewId(e.target.value)}
              placeholder="e.g. research-crew"
              className="w-64 rounded-xl border border-white/10 bg-[#0f1115] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 shadow-inner transition-all placeholder:text-gray-600"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-600 font-mono">.yaml</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-2.5 text-sm font-bold tracking-wide text-white transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-95 group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out"></div>
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Save Template
            </span>
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 font-medium flex items-center gap-3 backdrop-blur-md">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {message}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-6 rounded-xl bg-ruby/10 border border-ruby/20 p-5 space-y-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-ruby" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h4 className="text-sm font-bold tracking-wide text-ruby uppercase">Schema Validation Errors:</h4>
          </div>
          <ul className="list-disc pl-7 text-sm text-ruby/80 space-y-1 font-mono">
            {errors.map((err, idx) => (
              <li key={idx}><strong className="text-ruby">{err.field}</strong>: {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mac-style Editor Frame */}
      <div className="rounded-2xl border border-white/10 bg-[#1e1e1e] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] h-[65vh] flex flex-col group transition-all hover:border-white/20">
        <div className="bg-[#2d2d2d] px-4 py-3 flex items-center border-b border-black/40">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-black/20"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-black/20"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80 border border-black/20"></div>
          </div>
          <div className="mx-auto text-xs font-mono text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity">
            {crewId ? `${crewId}.yaml` : 'untitled.yaml'}
          </div>
        </div>
        <div className="flex-1 relative">
          <MonacoEditor
            language="yaml"
            theme="vs-dark"
            value={yamlCode}
            onChange={(val) => setYamlCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
              lineHeight: 24,
              padding: { top: 24, bottom: 24 },
              scrollbar: { vertical: 'visible', verticalScrollbarSize: 10 },
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              formatOnPaste: true,
            }}
          />
        </div>
      </div>
    </div>
  );
};
