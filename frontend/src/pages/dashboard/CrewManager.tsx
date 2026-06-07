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
        setErrors([{ field: 'server', message: 'Failed to write crew configuration template.' }]);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 font-sohne font-light tracking-tight text-text">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-medium tracking-tighter">Crew Configuration Manager</h2>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={crewId}
            onChange={(e) => setCrewId(e.target.value)}
            placeholder="e.g. research-crew"
            className="rounded-lg border border-ink-300 bg-ink-200 px-4 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSave}
            className="rounded-lg bg-primary px-5 py-2 font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Save Template
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 font-medium">
          {message}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-4 space-y-2">
          <h4 className="text-sm font-medium text-red-400">Schema Validation Errors found:</h4>
          <ul className="list-disc pl-5 text-sm text-red-400/90">
            {errors.map((err, idx) => (
              <li key={idx}><strong className="text-red-400">{err.field}</strong>: {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Editor Frame */}
      <div className="rounded-2xl border border-ink-300 bg-ink-200 overflow-hidden shadow-2xl h-[60vh]">
        <MonacoEditor
          language="yaml"
          theme="vs-dark"
          value={yamlCode}
          onChange={(val) => setYamlCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineHeight: 24,
            padding: { top: 16 },
            scrollbar: { vertical: 'visible' }
          }}
        />
      </div>
    </div>
  );
};
