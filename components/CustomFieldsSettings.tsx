import React, { useEffect, useState, useCallback } from 'react';
import { CustomFieldDefinition, DealStage } from '../types';
import * as crm from '../services/crmService';
import { Plus, Trash2, Edit3, X, Check, Loader2, GripVertical } from 'lucide-react';

export const shouldShowEditor = (editingId: string | null, creating: boolean): boolean =>
  creating || editingId !== null;

export const CustomFieldsSettings: React.FC = () => {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  const [creatingStage, setCreatingStage] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [fieldForm, setFieldForm] = useState({ name: '', key: '', type: 'TEXT' as const, options: '', isRequired: false, sortOrder: 0 });
  const [stageForm, setStageForm] = useState({ name: '', key: '', color: '#64748b', sortOrder: 0, isActive: true });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fieldsData, stagesData] = await Promise.all([crm.listCustomFields(), crm.listDealStages()]);
      setFields(fieldsData);
      setStages(stagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Field handlers
  const handleSaveField = async () => {
    if (!fieldForm.name.trim() || !fieldForm.key.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingFieldId) {
        const updated = await crm.updateCustomField(editingFieldId, fieldForm);
        setFields(prev => prev.map(f => f.id === editingFieldId ? updated : f));
      } else {
        const created = await crm.createCustomField(fieldForm);
        setFields(prev => [...prev, created]);
      }
      resetFieldForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleEditField = (field: CustomFieldDefinition) => {
    setCreatingField(false);
    setEditingFieldId(field.id);
    setFieldForm({
      name: field.name,
      key: field.key,
      type: field.type as any,
      options: field.options || '',
      isRequired: field.isRequired || false,
      sortOrder: field.sortOrder || 0,
    });
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Delete this custom field? Values will be lost.')) return;
    await crm.deleteCustomField(id);
    setFields(prev => prev.filter(f => f.id !== id));
    if (editingFieldId === id) resetFieldForm();
  };

  const resetFieldForm = () => {
    setFieldForm({ name: '', key: '', type: 'TEXT', options: '', isRequired: false, sortOrder: 0 });
    setCreatingField(false);
    setEditingFieldId(null);
    setError(null);
  };

  // Stage handlers
  const handleSaveStage = async () => {
    if (!stageForm.name.trim() || !stageForm.key.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingStageId) {
        const updated = await crm.updateDealStage(editingStageId, stageForm);
        setStages(prev => prev.map(s => s.id === editingStageId ? updated : s));
      } else {
        const created = await crm.createDealStage(stageForm);
        setStages(prev => [...prev, created]);
      }
      resetStageForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stage');
    } finally {
      setSaving(false);
    }
  };

  const handleEditStage = (stage: DealStage) => {
    setCreatingStage(false);
    setEditingStageId(stage.id);
    setStageForm({
      name: stage.name,
      key: stage.key,
      color: stage.color,
      sortOrder: stage.sortOrder || 0,
      isActive: stage.isActive ?? true,
    });
  };

  const handleDeleteStage = async (id: string) => {
    if (!confirm('Delete this deal stage?')) return;
    await crm.deleteDealStage(id);
    setStages(prev => prev.filter(s => s.id !== id));
    if (editingStageId === id) resetStageForm();
  };

  const resetStageForm = () => {
    setStageForm({ name: '', key: '', color: '#64748b', sortOrder: 0, isActive: true });
    setCreatingStage(false);
    setEditingStageId(null);
    setError(null);
  };

  const typeOptions = [
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'SELECT', label: 'Dropdown (Select)' },
    { value: 'MULTISELECT', label: 'Multi-select' },
    { value: 'BOOLEAN', label: 'Checkbox' },
  ];

  return (
    <div className="space-y-8">
      {/* Custom Fields Section */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Custom Fields
            </h3>
            <p className="text-xs text-slate-500 mt-1">Add custom data fields to leads (e.g. Contract Value, Technical Contact, Implementation Date).</p>
          </div>
          {!editingFieldId && (
            <button
              onClick={() => {
                setFieldForm({ name: '', key: '', type: 'TEXT', options: '', isRequired: false, sortOrder: fields.length });
                setCreatingField(true);
                setError(null);
              }}
              className="flex items-center gap-1.5 text-[10px] bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          )}
        </div>

        {shouldShowEditor(editingFieldId, creatingField) && (
          <div className="bg-slate-900/60 border border-sky-500/20 rounded-xl p-5 space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{editingFieldId ? 'Edit' : 'New'} Custom Field</h4>
              <button onClick={resetFieldForm} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Field Name</label>
                <input type="text" value={fieldForm.name} onChange={e => setFieldForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Contract Value" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Field Key (no spaces)</label>
                <input type="text" value={fieldForm.key} onChange={e => setFieldForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} placeholder="e.g. contract_value" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Type</label>
                <select value={fieldForm.type} onChange={e => setFieldForm(f => ({ ...f, type: e.target.value as any }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                  {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Options (comma-separated, for SELECT/MULTISELECT)</label>
                <input type="text" value={fieldForm.options} onChange={e => setFieldForm(f => ({ ...f, options: e.target.value }))} placeholder="e.g. Yes,No,Maybe" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="required" checked={fieldForm.isRequired} onChange={e => setFieldForm(f => ({ ...f, isRequired: e.target.checked }))} className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500/40" />
              <label htmlFor="required" className="text-[10px] text-slate-400">Required field</label>
            </div>
            {error && <p className="text-[10px] text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={resetFieldForm} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleSaveField} disabled={saving} className="px-4 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Field
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center p-6 text-slate-500 text-xs">Loading fields...</div>
        ) : fields.length === 0 ? (
          <div className="text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
            No custom fields yet. Add your first field above.
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map(field => (
              <div key={field.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="text-xs font-bold text-white">{field.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{field.key} · {field.type} {field.isRequired && '· Required'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEditField(field)} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteField(field.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Deal Stages Section */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Deal Stages
            </h3>
            <p className="text-xs text-slate-500 mt-1">Customize your pipeline stages (colors, order, names).</p>
          </div>
          {!editingStageId && (
            <button
              onClick={() => {
                setStageForm({ name: '', key: '', color: '#64748b', sortOrder: stages.length, isActive: true });
                setCreatingStage(true);
                setError(null);
              }}
              className="flex items-center gap-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stage
            </button>
          )}
        </div>

        {shouldShowEditor(editingStageId, creatingStage) && (
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-5 space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{editingStageId ? 'Edit' : 'New'} Deal Stage</h4>
              <button onClick={resetStageForm} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Stage Name</label>
                <input type="text" value={stageForm.name} onChange={e => setStageForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Demo Scheduled" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Stage Key (no spaces)</label>
                <input type="text" value={stageForm.key} onChange={e => setStageForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} placeholder="e.g. demo_scheduled" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Color (hex)</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={stageForm.color} onChange={e => setStageForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-14 rounded border border-slate-800 bg-slate-950 cursor-pointer" />
                  <input type="text" value={stageForm.color} onChange={e => setStageForm(f => ({ ...f, color: e.target.value }))} placeholder="#64748b" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sort Order</label>
                <input type="number" value={stageForm.sortOrder} onChange={e => setStageForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={stageForm.isActive} onChange={e => setStageForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/40" />
              <label htmlFor="active" className="text-[10px] text-slate-400">Active stage</label>
            </div>
            {error && <p className="text-[10px] text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={resetStageForm} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleSaveStage} disabled={saving} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Stage
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center p-6 text-slate-500 text-xs">Loading stages...</div>
        ) : stages.length === 0 ? (
          <div className="text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
            No custom deal stages yet. Add your first stage above.
          </div>
        ) : (
          <div className="space-y-2">
            {stages.map(stage => (
              <div key={stage.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-700" style={{ backgroundColor: stage.color }} />
                  <div>
                    <div className="text-xs font-bold text-white">{stage.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{stage.key} · Order: {stage.sortOrder} {stage.isActive ? '' : '· Inactive'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEditStage(stage)} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteStage(stage.id)} className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
