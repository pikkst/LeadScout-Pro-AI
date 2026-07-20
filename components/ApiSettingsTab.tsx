import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
}

const ApiSettingsTab: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    scopes: 'read',
  });

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/api-keys');
      const data = await res.json();
      setKeys(data);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          scopes: formData.scopes.split(',').map(s => s.trim()),
        }),
      });
      const data = await res.json();
      setNewKey(data.key);
      await loadKeys();
      setShowForm(false);
      setFormData({ name: '', scopes: 'read' });
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Revoke this API key?')) return;
    try {
      await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      await loadKeys();
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const copyToClipboard = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading API settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-sky-400" />
            API Keys
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage API keys for external integrations (Zapier, Make, custom scripts)
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Key
          </button>
        )}
      </div>

      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <h4 className="text-sm font-bold text-emerald-400 mb-2">API Key Created</h4>
          <p className="text-xs text-slate-400 mb-3">
            Save this key now. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-200 font-mono break-all">
              {newKey}
            </code>
            <button
              onClick={copyToClipboard}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-4">Create API Key</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="Zapier Integration"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Scopes (comma-separated)
              </label>
              <input
                type="text"
                value={formData.scopes}
                onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="read, write"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Create Key
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {keys.map((key) => (
          <div key={key.id} className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">{key.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {key.keyPrefix}... • Created {new Date(key.createdAt).toLocaleDateString('et-EE')}
                {key.lastUsedAt && ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString('et-EE')}`}
              </div>
              <div className="flex gap-1 mt-2">
                {key.scopes.map((scope) => (
                  <span key={scope} className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {scope}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleDelete(key.id)}
              className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        ))}
        {keys.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-xs">
            No API keys yet. Create one to enable external integrations.
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiSettingsTab;
