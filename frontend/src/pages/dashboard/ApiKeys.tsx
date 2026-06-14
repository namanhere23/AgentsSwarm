import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Plus, Copy, Check, Trash2, ShieldAlert } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  masked_key: string;
}

export const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyName, setKeyName] = useState('CLI Access Key');

  useEffect(() => {
    fetchKeys();
  }, []);

  const getHeaders = async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error("Not authenticated");
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_APP_URL || ''}/api/v1/auth/api-keys`, {
        headers: await getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch API keys');
      const data = await res.json();
      setKeys(data);
    } catch (error) {
      console.error(error);
      toast.error('Could not load API keys.');
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for the key.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_APP_URL || ''}/api/v1/auth/api-keys?name=${encodeURIComponent(keyName)}`, {
        method: 'POST',
        headers: await getHeaders()
      });
      if (!res.ok) throw new Error('Failed to generate API key');
      const data = await res.json();
      setNewKey(data.api_key);
      toast.success('New API key generated successfully!');
      fetchKeys(); // refresh list
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate key.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Key className="w-8 h-8 text-blue-500" />
            API Keys
          </h1>
          <p className="text-gray-400 mt-2">Manage your personal access tokens for the Nexsus CLI.</p>
        </div>
      </header>

      {newKey && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white">Save your API Key</h3>
              <p className="text-gray-300 text-sm mt-1">
                Please copy this key and save it somewhere safe. For security reasons, <strong>you will not be able to see it again.</strong>
              </p>
              
              <div className="mt-4 flex items-center gap-3">
                <code className="flex-1 block bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-blue-300 font-mono text-sm break-all">
                  {newKey}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-2">New Key Name</label>
            <input 
              type="text" 
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. CLI Access Key"
            />
          </div>
          <button 
            onClick={generateKey}
            disabled={generating}
            className="bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {generating ? 'Generating...' : 'Create new secret key'}
          </button>
        </div>

        <div className="p-0">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-gray-300 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Key</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading keys...</td></tr>
              ) : keys.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No API keys found. Create one above to get started.</td></tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-gray-200">{key.name}</td>
                    <td className="px-6 py-4 font-mono text-gray-500">{key.masked_key}</td>
                    <td className="px-6 py-4">{new Date(key.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {/* Delete functionality can be added later */}
                      <button className="text-gray-500 hover:text-red-400 transition-colors" title="Delete functionality coming soon">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
