import React, { useState, useEffect } from 'react';
import { api } from '../services/apiClient';
import type { Phase4WorkspaceThreshold } from '../types';

const WorkspaceThresholdsTab: React.FC = () => {
  const [threshold, setThreshold] = useState<Phase4WorkspaceThreshold | null>(null);
  const [evaluation, setEvaluation] = useState<{ shouldPromote: boolean; soloMode: boolean; thresholds: Record<string, number>; current: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ autoPromoteUsers: 3, autoPromoteLeads: 50, autoPromoteAutomation: 20, currentUserCount: 1, currentLeadCount: 0, currentAutomationCount: 0 });

  const loadThreshold = async () => {
    setLoading(true);
    try {
      const result = await api<Phase4WorkspaceThreshold>('/workspace-thresholds');
      setThreshold(result);
      setForm({ autoPromoteUsers: result.autoPromoteUsers, autoPromoteLeads: result.autoPromoteLeads, autoPromoteAutomation: result.autoPromoteAutomation, currentUserCount: result.currentUserCount, currentLeadCount: result.currentLeadCount, currentAutomationCount: result.currentAutomationCount });
    } catch (err) {
      console.error('Failed to load workspace threshold:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluation = async () => {
    try {
      const result = await api<{ shouldPromote: boolean; soloMode: boolean; thresholds: Record<string, number>; current: Record<string, number> }>('/workspace-thresholds/evaluate');
      setEvaluation(result);
    } catch (err) {
      console.error('Failed to evaluate promotion:', err);
    }
  };

  useEffect(() => { loadThreshold(); loadEvaluation(); }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api<Phase4WorkspaceThreshold>('/workspace-thresholds', { method: 'PUT', body: JSON.stringify(form) });
      setThreshold(result);
      loadEvaluation();
    } catch (err) {
      console.error('Failed to update threshold:', err);
    }
  };

  const progressPercent = (current: number, threshold: number) => threshold === 0 ? 0 : Math.min(100, Math.round((current / threshold) * 100));

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">Solo-to-Team Workspace Thresholds</h2>
        {threshold && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Users</div>
              <div className="text-2xl font-black text-slate-200">{threshold.currentUserCount} / {threshold.autoPromoteUsers}</div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-sky-500 h-full transition-all" style={{ width: `${progressPercent(threshold.currentUserCount, threshold.autoPromoteUsers)}%` }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Leads</div>
              <div className="text-2xl font-black text-slate-200">{threshold.currentLeadCount} / {threshold.autoPromoteLeads}</div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progressPercent(threshold.currentLeadCount, threshold.autoPromoteLeads)}%` }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Automation</div>
              <div className="text-2xl font-black text-slate-200">{threshold.currentAutomationCount} / {threshold.autoPromoteAutomation}</div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-purple-500 h-full transition-all" style={{ width: `${progressPercent(threshold.currentAutomationCount, threshold.autoPromoteAutomation)}%` }} />
              </div>
            </div>
          </div>
        )}
        {evaluation && (
          <div className={`p-4 rounded-xl border ${evaluation.shouldPromote ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} mb-6`}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1">
              {evaluation.shouldPromote ? 'Promotion Recommended' : 'Solo Mode Active'}
            </div>
            <div className="text-[10px] text-slate-400">
              Current: {evaluation.current.users} users, {evaluation.current.leads} leads, {evaluation.current.automation} automation actions
            </div>
          </div>
        )}
        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Auto-Promote Users</label>
            <input type="number" min="1" value={form.autoPromoteUsers} onChange={(e) => setForm({ ...form, autoPromoteUsers: parseInt(e.target.value, 10) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Auto-Promote Leads</label>
            <input type="number" min="1" value={form.autoPromoteLeads} onChange={(e) => setForm({ ...form, autoPromoteLeads: parseInt(e.target.value, 10) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Auto-Promote Automation</label>
            <input type="number" min="1" value={form.autoPromoteAutomation} onChange={(e) => setForm({ ...form, autoPromoteAutomation: parseInt(e.target.value, 10) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Users</label>
            <input type="number" min="0" value={form.currentUserCount} onChange={(e) => setForm({ ...form, currentUserCount: parseInt(e.target.value, 10) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Leads</label>
            <input type="number" min="0" value={form.currentLeadCount} onChange={(e) => setForm({ ...form, currentLeadCount: parseInt(e.target.value, 10) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Automation</label>
            <input type="number" min="0" value={form.currentAutomationCount} onChange={(e) => setForm({ ...form, currentAutomationCount: parseInt(e.target.value, 10) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider">Update Thresholds</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceThresholdsTab;
