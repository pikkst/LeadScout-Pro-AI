import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiClient';
import type { Phase4GraphNode, Phase4GraphEdge } from '../types';

interface GraphData {
  nodes: Phase4GraphNode[];
  edges: Phase4GraphEdge[];
}

const NODE_TYPE_COLORS: Record<string, string> = {
  ACCOUNT: 'bg-sky-500',
  CONTACT: 'bg-emerald-500',
  LEAD: 'bg-amber-500',
  OPPORTUNITY: 'bg-purple-500',
  RELATIONSHIP: 'bg-pink-500',
  PITCH: 'bg-indigo-500',
  MEETING: 'bg-teal-500',
  TASK: 'bg-orange-500',
  STAGE: 'bg-slate-500',
  REVENUE: 'bg-green-500',
  SIGNAL: 'bg-red-500',
  CONVERSATION: 'bg-cyan-500',
  DOCUMENT: 'bg-yellow-500',
};

const GraphTab: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [centerType, setCenterType] = useState('');
  const [centerId, setCenterId] = useState('');
  const [depth, setDepth] = useState(2);
  const [syncAccountId, setSyncAccountId] = useState('');
  const [syncing, setSyncing] = useState(false);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (centerType) params.set('centerNodeType', centerType);
      if (centerId) params.set('centerNodeId', centerId);
      params.set('depth', String(depth));
      const result = await api<GraphData>(`/graph?${params.toString()}`);
      setData(result);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAccount = async () => {
    if (!syncAccountId) return;
    setSyncing(true);
    try {
      const result = await api<{ synced: boolean; nodeCount: number; root: Phase4GraphNode }>(`/graph/sync/account/${syncAccountId}`, { method: 'POST' });
      setData({ nodes: [result.root], edges: [] });
    } catch (err) {
      console.error('Failed to sync account:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const edgeCountBySource = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const edge of data.edges) {
      const key = `${edge.sourceType}:${edge.sourceId}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [data.edges]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4 flex items-center gap-2">
          Outcome Graph Explorer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Center Node Type</label>
            <select value={centerType} onChange={(e) => setCenterType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">All</option>
              {Object.keys(NODE_TYPE_COLORS).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Center Node ID</label>
            <input value={centerId} onChange={(e) => setCenterId(e.target.value)} placeholder="optional" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Depth</label>
            <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={loadGraph} disabled={loading} className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider disabled:bg-slate-800 disabled:text-slate-500">
              {loading ? 'Loading...' : 'Refresh Graph'}
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sync Account Graph</label>
            <div className="flex gap-2">
              <input value={syncAccountId} onChange={(e) => setSyncAccountId(e.target.value)} placeholder="Account ID" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
              <button onClick={handleSyncAccount} disabled={syncing || !syncAccountId} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider disabled:bg-slate-800 disabled:text-slate-500">
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Nodes ({data.nodes.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.nodes.map((node) => (
              <div key={node.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className={`w-2.5 h-2.5 rounded-full ${NODE_TYPE_COLORS[node.nodeType] || 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{node.title}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{node.nodeType} · {(node.nodeId ?? "").slice(0, 8)}...</div>
                </div>
                <span className="text-[10px] text-slate-500">{edgeCountBySource[`${node.nodeType}:${node.nodeId}`] || 0} edges</span>
              </div>
            ))}
            {data.nodes.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No nodes found</div>}
          </div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Edges ({data.edges.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.edges.map((edge) => (
              <div key={edge.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{edge.sourceType}:{edge.sourceId.slice(0, 8)}... → {edge.targetType}:{edge.targetId.slice(0, 8)}...</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{edge.edgeType} · weight {edge.weight.toFixed(2)}</div>
                </div>
              </div>
            ))}
            {data.edges.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No edges found</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphTab;
