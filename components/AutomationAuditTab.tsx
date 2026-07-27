import React, { useState, useEffect } from 'react';
import { api } from '../services/apiClient';
import type { Phase4AutomationAuditLog } from '../types';

const AutomationAuditTab: React.FC = () => {
  const [logs, setLogs] = useState<Phase4AutomationAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ entityType: '', entityId: '', actorType: '', actorId: '' });

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.entityId) params.set('entityId', filters.entityId);
      if (filters.actorType) params.set('actorType', filters.actorType);
      if (filters.actorId) params.set('actorId', filters.actorId);
      const result = await api<Phase4AutomationAuditLog[]>(`/automation-audit?${params.toString()}`);
      setLogs(result);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const actorBadge = (actorType: string) => {
    const colors: Record<string, string> = {
      USER: 'bg-sky-500/20 text-sky-400',
      AGENT: 'bg-purple-500/20 text-purple-400',
      SCHEDULER: 'bg-amber-500/20 text-amber-400',
      SYSTEM: 'bg-slate-500/20 text-slate-400',
    };
    return colors[actorType] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">Automation Audit Trail</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Entity Type</label>
            <input value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Entity ID</label>
            <input value={filters.entityId} onChange={(e) => setFilters({ ...filters, entityId: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actor Type</label>
            <input value={filters.actorType} onChange={(e) => setFilters({ ...filters, actorType: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actor ID</label>
            <input value={filters.actorId} onChange={(e) => setFilters({ ...filters, actorId: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
        </div>
        <button onClick={loadLogs} disabled={loading} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider disabled:bg-slate-800 disabled:text-slate-500">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Audit Logs ({logs.length})</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${actorBadge(log.actorType)}`}>{log.actorType}</span>
                <span className="text-xs font-bold text-slate-200">{log.actionType}</span>
                <span className="text-[10px] text-slate-500">{log.entityType}:{log.entityId.slice(0, 8)}...</span>
              </div>
              <div className="text-[10px] text-slate-500">
                actor {log.actorId.slice(0, 8)}... · budget {log.budgetUsed} · tokens {log.tokenUsed} · {log.createdAt ? new Date(log.createdAt).toLocaleString() : "unknown"}
              </div>
              {log.error && <div className="text-[10px] text-red-400 mt-1">Error: {log.error}</div>}
              {log.previousState && (
                <details className="mt-1">
                  <summary className="text-[10px] text-slate-500 cursor-pointer">Previous State</summary>
                  <pre className="text-[10px] text-slate-400 mt-1 bg-slate-950 p-2 rounded overflow-x-auto">{JSON.stringify(log.previousState, null, 2)}</pre>
                </details>
              )}
              {log.newState && (
                <details className="mt-1">
                  <summary className="text-[10px] text-slate-500 cursor-pointer">New State</summary>
                  <pre className="text-[10px] text-slate-400 mt-1 bg-slate-950 p-2 rounded overflow-x-auto">{JSON.stringify(log.newState, null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
          {logs.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No audit logs found</div>}
        </div>
      </div>
    </div>
  );
};

export default AutomationAuditTab;
