import React, { useEffect, useState, useCallback } from 'react';
import { FollowUpSequence, SequenceStep } from '../types';
import * as crm from '../services/crmService';
import { Plus, Trash2, Edit3, X, Check, Loader2, Play, Square, GripVertical } from 'lucide-react';

export const SequencesSettings: React.FC = () => {
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerStage: 'Discovered',
    isActive: true,
    steps: [] as SequenceStep[],
  });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crm.listSequences();
      setSequences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sequences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ name: '', description: '', triggerStage: 'Discovered', isActive: true, steps: [] });
    setEditingId(null);
    setIsFormOpen(false);
    setError(null);
  };

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...f.steps, { id: `step-${Date.now()}`, order: f.steps.length, delayDays: 0, actionType: 'TASK', taskName: '', isActive: true }],
    }));
  };

  const updateStep = (index: number, changes: Partial<SequenceStep>) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map((s, i) => i === index ? { ...s, ...changes } : s),
    }));
  };

  const removeStep = (index: number) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await crm.updateSequence(editingId, form);
        setSequences(prev => prev.map(s => s.id === editingId ? updated : s));
      } else {
        const created = await crm.createSequence(form);
        setSequences(prev => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (seq: FollowUpSequence) => {
    setEditingId(seq.id);
    setIsFormOpen(true);
    setForm({
      name: seq.name,
      description: seq.description || '',
      triggerStage: seq.triggerStage,
      isActive: seq.isActive,
      steps: seq.steps || [],
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sequence?')) return;
    await crm.deleteSequence(id);
    setSequences(prev => prev.filter(s => s.id !== id));
    if (editingId === id) resetForm();
  };

  const handleToggleActive = async (seq: FollowUpSequence) => {
    try {
      const updated = await crm.updateSequence(seq.id, { isActive: !seq.isActive });
      setSequences(prev => prev.map(s => s.id === seq.id ? updated : s));
    } catch (err) {
      console.error('Failed to toggle sequence:', err);
    }
  };

  const stageOptions = [
    { value: 'Discovered', label: 'Discovered' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Negotiation', label: 'Negotiation' },
    { value: 'Signed', label: 'Signed' },
    { value: 'Active', label: 'Active' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Follow-up Sequences
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Automate follow-up emails, tasks, and webhooks based on lead stage.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => { setIsFormOpen(true); setForm({ name: '', description: '', triggerStage: 'Discovered', isActive: true, steps: [] }); }}
            className="flex items-center gap-1.5 text-[10px] bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Sequence
          </button>
        )}
      </div>

      {(isFormOpen || editingId) && (
        <div className="bg-slate-950/60 border border-sky-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">{editingId ? 'Edit' : 'New'} Sequence</h4>
            <button onClick={resetForm} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sequence Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cold Outreach Follow-up" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Trigger Stage</label>
              <select value={form.triggerStage} onChange={e => setForm(f => ({ ...f, triggerStage: e.target.value }))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                {stageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="When should this sequence run?" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Steps</label>
              <button type="button" onClick={addStep} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg font-bold uppercase transition-colors">Add Step</button>
            </div>
            <div className="space-y-3">
              {form.steps.map((step, idx) => (
                <div key={step.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold text-white">Step {idx + 1}</span>
                    </div>
                    <button type="button" onClick={() => removeStep(idx)} className="text-slate-400 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Delay (days)</label>
                      <input type="number" value={step.delayDays} onChange={e => updateStep(idx, { delayDays: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Action</label>
                      <select value={step.actionType} onChange={e => updateStep(idx, { actionType: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                        <option value="TASK">Task</option>
                        <option value="EMAIL">Email</option>
                        <option value="WEBHOOK">Webhook</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Task Name / Subject</label>
                      <input type="text" value={step.taskName || step.subject || ''} onChange={e => updateStep(idx, step.actionType === 'EMAIL' ? { subject: e.target.value } : { taskName: e.target.value })} placeholder={step.actionType === 'EMAIL' ? 'Email subject' : 'Task name'} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
                    </div>
                  </div>
                  {step.actionType === 'EMAIL' && (
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email Body</label>
                      <textarea value={step.body || ''} onChange={e => updateStep(idx, { body: e.target.value })} rows={3} placeholder="Email body..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono" />
                    </div>
                  )}
                </div>
              ))}
              {form.steps.length === 0 && (
                <div className="text-center p-4 text-slate-500 text-[10px] border border-dashed border-slate-800 rounded-xl">
                  No steps yet. Click "Add Step" to build your sequence.
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-[10px] text-rose-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || form.steps.length === 0} className="px-4 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Sequence
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center p-6 text-slate-500 text-xs">Loading sequences...</div>
      ) : sequences.length === 0 ? (
        <div className="text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
          No follow-up sequences yet. Create your first sequence to automate outreach.
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map(seq => (
            <div key={seq.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white truncate">{seq.name}</h4>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${seq.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {seq.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{seq.description || 'No description'}</p>
                  <p className="text-[9px] text-slate-500 mt-1">Trigger: {seq.triggerStage} · {seq.steps?.length || 0} steps</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggleActive(seq)} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800" title={seq.isActive ? 'Pause' : 'Activate'}>
                    {seq.isActive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleEdit(seq)} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(seq.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {seq.steps && seq.steps.length > 0 && (
                <div className="space-y-1.5">
                  {seq.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-2 text-[10px] bg-slate-950/40 rounded-lg px-3 py-2">
                      <span className="text-slate-500 font-mono">{idx + 1}.</span>
                      <span className="text-slate-400">+{step.delayDays}d</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        step.actionType === 'EMAIL' ? 'bg-sky-500/10 text-sky-400' :
                        step.actionType === 'TASK' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-purple-500/10 text-purple-400'
                      }`}>{step.actionType}</span>
                      <span className="text-slate-300 truncate">{step.taskName || step.subject || 'Unnamed step'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
