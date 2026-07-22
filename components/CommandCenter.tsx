import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Loader2, RefreshCw, ShieldCheck, Target } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { AppTab, CommandCenterData, fetchCommandCenter } from '../services/activationService';

export const CommandCenter: React.FC<{ onNavigate: (tab: AppTab) => void; canManageCompliance?: boolean }> = ({ onNavigate, canManageCompliance = false }) => {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setLoading(true); setError(null);
    fetchCommandCenter().then(setData).catch((err) => setError(err instanceof ApiError ? err.message : 'Command center could not be loaded.')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading && !data) return <div className="flex items-center gap-2 rounded-2xl border border-slate-800 p-6 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Prioritizing today’s work…</div>;
  if (error && !data) return <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-300">{error}<button type="button" onClick={load} className="ml-3 underline">Try again</button></div>;
  if (!data) return null;

  const metrics = [
    ['Overdue replies', data.counts.overdueReplies, 'crm'],
    ['Draft approvals', data.counts.approvals, 'outreach'],
    ['Meetings (7 days)', data.counts.meetings, 'calendar'],
    ['Failed sends', data.counts.failedSends, 'outreach'],
  ] as const;

  return <section aria-labelledby="command-center-title" className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 id="command-center-title" className="flex items-center gap-2 text-lg font-black text-white"><Target className="h-5 w-5 text-sky-400" />Today’s command center</h2><p className="mt-1 text-xs text-slate-500">The highest-value actions, risks, and meetings across your workspace.</p></div><button type="button" onClick={load} aria-label="Refresh command center" className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label, count, target]) => <button key={label} type="button" onClick={() => onNavigate(target)} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left hover:border-sky-500/40"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span><span className="mt-1 block text-2xl font-black text-white">{count}</span></button>)}</div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 lg:col-span-2"><h3 className="mb-3 text-sm font-bold text-white">Next best actions</h3>{data.actions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center"><CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" /><p className="text-xs text-slate-400">You are caught up. Add a target or prepare the next outreach.</p><button type="button" onClick={() => onNavigate('scout')} className="mt-3 text-xs font-bold text-sky-400">Find targets</button></div> : <ul className="space-y-2">{data.actions.slice(0, 8).map((action) => <li key={action.id}><button type="button" onClick={() => onNavigate(action.target)} className="flex w-full items-center gap-3 rounded-xl border border-slate-850 bg-slate-900/50 p-3 text-left hover:border-sky-500/30"><span className={`h-2 w-2 shrink-0 rounded-full ${action.priority === 'urgent' ? 'bg-rose-500' : action.priority === 'high' ? 'bg-amber-400' : 'bg-sky-400'}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-200">{action.title}</span><span className="block truncate text-[10px] text-slate-500">{action.detail}</span></span><ChevronRight className="h-4 w-4 text-slate-600" /></button></li>)}</ul>}</div>
      <div className={`rounded-2xl border p-5 ${data.deliverability.paused ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}><h3 className="flex items-center gap-2 text-sm font-bold text-white">{data.deliverability.paused ? <AlertTriangle className="h-4 w-4 text-rose-400" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}Deliverability</h3><p className="mt-3 text-2xl font-black text-white">{data.deliverability.sent24Hours} / {data.deliverability.dailySendLimit}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">rolling 24-hour sends</p><div className="mt-4 space-y-1 text-xs text-slate-400"><p>Bounces: {data.deliverability.bounceRate}%</p><p>Complaints: {data.deliverability.complaintRate}%</p><p>Suppressed: {data.deliverability.suppressionCount}</p></div>{canManageCompliance && <button type="button" onClick={() => onNavigate('settings')} className="mt-4 text-xs font-bold text-sky-400">Open compliance center</button>}</div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">{data.highValueLeads.slice(0, 3).map((lead) => <button key={lead.id} type="button" onClick={() => onNavigate('crm')} className="rounded-xl border border-slate-800 p-4 text-left"><span className="text-xs font-bold text-white">{lead.name}</span><span className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><CalendarDays className="h-3 w-3" />{lead.stage} · €{(lead.estimatedValue || 0).toLocaleString()}</span></button>)}</div>
  </section>;
};
