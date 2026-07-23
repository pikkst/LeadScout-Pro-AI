import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { QualificationPlaybook, QualificationStage } from '../types';
import * as crm from '../services/crmService';

export const QualificationTab: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<QualificationPlaybook[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<QualificationPlaybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [framework, setFramework] = useState<'BANT' | 'MEDDPICC' | 'SPICED' | 'CUSTOM'>('BANT');
  const [isCustom, setIsCustom] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crm.listQualificationPlaybooks();
      setPlaybooks(data);
    } catch (err) {
      console.error('Failed to load qualification playbooks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await crm.deleteQualificationPlaybook(id);
      await load();
      if (selectedPlaybook?.id === id) setSelectedPlaybook(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await crm.createQualificationPlaybook({ name, framework, isCustom, description: '' });
      setName('');
      setShowForm(false);
      await load();
    } catch (err) {
      console.error('Failed to create playbook:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Qualification Playbooks</h2>
          <p className="text-xs text-slate-500 mt-1">BANT, MEDDPICC, SPICED, and custom qualification frameworks.</p>
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
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. Enterprise BANT" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Framework</label>
              <select value={framework} onChange={(e) => setFramework(e.target.value as typeof framework)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="BANT">BANT</option>
                <option value="MEDDPICC">MEDDPICC</option>
                <option value="SPICED">SPICED</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} className="rounded border-slate-700 bg-slate-950" />
            <span className="text-xs text-slate-400">Custom framework</span>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold rounded-lg transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500 text-xs">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map(pb => (
            <div key={pb.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{pb.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{pb.framework}{pb.isCustom ? ' · Custom' : ''}</div>
                </div>
                <button onClick={() => handleDelete(pb.id)} className="p-1.5 rounded text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400">{Array.isArray(pb.stages) ? pb.stages.length : 0} stages</div>
              <button
                onClick={() => setSelectedPlaybook(pb)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg hover:text-white hover:border-slate-700 transition-colors"
              >
                View Stages
              </button>
            </div>
          ))}
          {playbooks.length === 0 && !loading && (
            <div className="text-center p-8 text-slate-500 text-xs italic col-span-full">No qualification playbooks yet.</div>
          )}
        </div>
      )}

      {selectedPlaybook && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{selectedPlaybook.name} Stages</h3>
            <button onClick={() => setSelectedPlaybook(null)} className="text-[10px] text-slate-400 hover:text-white">Close</button>
          </div>
          <div className="space-y-2">
            {(Array.isArray(selectedPlaybook.stages) ? selectedPlaybook.stages : []).sort((a, b) => a.sortOrder - b.sortOrder).map((stage: QualificationStage) => (
              <div key={stage.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3">
                <div>
                  <div className="text-xs font-bold text-white">{stage.name} <span className="text-slate-500 font-normal">({stage.key})</span></div>
                  <div className="text-[10px] text-slate-400">{Array.isArray(stage.criterions) ? stage.criterions.length : 0} criterions · Sort order: {stage.sortOrder}</div>
                </div>
                {stage.isRequired && <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded">Required</span>}
              </div>
            ))}
            {(!Array.isArray(selectedPlaybook.stages) || selectedPlaybook.stages.length === 0) && (
              <div className="text-xs text-slate-500 italic">No stages configured.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};