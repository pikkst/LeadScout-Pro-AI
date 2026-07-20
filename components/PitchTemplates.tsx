import React, { useEffect, useState, useCallback } from 'react';
import { PitchTemplate } from '../types';
import * as crm from '../services/crmService';
import { Plus, Trash2, Edit3, X, Check, Loader2, Sparkles } from 'lucide-react';

export const PitchTemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<PitchTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', htmlContent: '', textContent: '', focus: '' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crm.listTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ name: '', subject: '', htmlContent: '', textContent: '', focus: '' });
    setEditingId(null);
    setIsFormOpen(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.htmlContent.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await crm.updateTemplate(editingId, form);
        setTemplates(prev => prev.map(t => t.id === editingId ? updated : t));
      } else {
        const created = await crm.createTemplate(form);
        setTemplates(prev => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tpl: PitchTemplate) => {
    setEditingId(tpl.id);
    setIsFormOpen(true);
    setForm({
      name: tpl.name,
      subject: tpl.subject,
      htmlContent: tpl.htmlContent,
      textContent: tpl.textContent || '',
      focus: tpl.focus || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await crm.deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Pitch Templates
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Save reusable email structures for faster outreach drafting.</p>
        </div>
        {!editingId && !isFormOpen && (
          <button
            onClick={() => { setIsFormOpen(true); setForm({ name: '', subject: '', htmlContent: '', textContent: '', focus: '' }); }}
            className="flex items-center gap-1.5 text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Template
          </button>
        )}
      </div>

      {(editingId || isFormOpen) && (
        <div className="bg-slate-950/60 border border-purple-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {editingId ? 'Edit Template' : 'New Template'}
            </h4>
            <button onClick={resetForm} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Template Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Cold Intro - Fintech"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Focus (optional)</label>
              <input
                type="text"
                value={form.focus}
                onChange={e => setForm(f => ({ ...f, focus: e.target.value }))}
                placeholder="e.g. voip_carriers"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subject Line</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Partnership Inquiry: {{company}} <> Unitel Global"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">HTML Body</label>
            <textarea
              value={form.htmlContent}
              onChange={e => setForm(f => ({ ...f, htmlContent: e.target.value }))}
              rows={8}
              placeholder="<html>...</html>"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Plain Text Body (optional)</label>
            <textarea
              value={form.textContent}
              onChange={e => setForm(f => ({ ...f, textContent: e.target.value }))}
              rows={3}
              placeholder="Plain text version..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          {error && <p className="text-[10px] text-rose-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.subject.trim() || !form.htmlContent.trim()}
              className="px-4 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editingId ? 'Update' : 'Create'} Template
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center p-6 text-slate-500 text-xs">Loading templates...</div>
      ) : templates.length === 0 && !editingId && !isFormOpen ? (
        <div className="text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
          No pitch templates yet. Create your first template above to speed up outreach.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{tpl.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{tpl.subject}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(tpl)} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {tpl.focus && (
                <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  {tpl.focus}
                </span>
              )}
              <p className="text-[10px] text-slate-500">
                Updated {new Date(tpl.updatedAt || tpl.createdAt || '').toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
