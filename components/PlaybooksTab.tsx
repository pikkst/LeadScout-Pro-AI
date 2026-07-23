import React, { useEffect, useState, useCallback } from 'react';
import { Play, Plus, Trash2, RefreshCw, TestTube2, GitBranch, ShieldCheck } from 'lucide-react';
import { Playbook, PlaybookVersion, PlaybookTestRun } from '../types';
import * as crm from '../services/crmService';

export const PlaybooksTab: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'OUTREACH' | 'QUALIFICATION' | 'NURTURING' | 'CUSTOM'>('OUTREACH');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crm.listPlaybooks();
      setPlaybooks(data);
    } catch (err) {
      console.error('Failed to load playbooks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await crm.createPlaybook({ name, description, type, isActive: true });
      setName('');
      setDescription('');
      setShowForm(false);
      await load();
    } catch (err) {
      console.error('Failed to create playbook:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await crm.deletePlaybook(id);
      await load();
    } catch (err) {
      console.error('Failed to delete playbook:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Playbooks</h2>
          <p className="text-xs text-slate-500 mt-1">Governed, measurable, and improvable selling workflows.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Playbook
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. Cold Outreach v2" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="OUTREACH">Outreach</option>
                <option value="QUALIFICATION">Qualification</option>
                <option value="NURTURING">Nurturing</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" rows={3} placeholder="What does this playbook achieve?" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold rounded-lg transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500 text-xs">Loading playbooks...</div>
      ) : (
        <div className="space-y-3">
          {playbooks.map(playbook => (
            <div key={playbook.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-4">
              <div>
                <div className="text-sm font-bold text-white">{playbook.name}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {playbook.type} · {playbook.status} · v{(playbook.versions?.[0]?.version ?? 0) || '—'}
                </div>
                {playbook.description && <div className="text-[10px] text-slate-400 mt-1">{playbook.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const versions = await crm.getPlaybookVersions(playbook.id);
                      if (versions.length > 0) {
                        await crm.startPlaybookTest(playbook.id, versions[0].id);
                        alert('Test run started');
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                  title="Test mode"
                >
                  <TestTube2 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    const changelog = prompt('Version changelog:', '');
                    if (changelog === null) return;
                    try {
                      await crm.createPlaybookVersion(playbook.id, {
                        changelog: changelog || '',
                        steps: [],
                        conditions: [],
                        actions: [],
                        branches: [],
                      });
                      await load();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
                  title="New version"
                >
                  <GitBranch className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(playbook.id)}
                  className="p-2 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {playbooks.length === 0 && !loading && (
            <div className="text-center p-8 text-slate-500 text-xs italic">No playbooks yet. Create your first to start governing outreach.</div>
          )}
        </div>
      )}
    </div>
  );
};
