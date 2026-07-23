import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Play, Check, X, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';
import { Phase3AgentDefinition, Phase3AgentRun } from '../types';
import * as api from '../services/phase3Api';

const AGENT_TYPES = ["RESEARCH", "ROUTING", "BRIEFING", "FOLLOW_UP", "CRM_HYGIENE"] as const;

export const AgentsTab: React.FC = () => {
  const [agents, setAgents] = useState<Phase3AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, Phase3AgentRun[]>>({});
  const [name, setName] = useState("");
  const [type, setType] = useState<typeof AGENT_TYPES[number]>("RESEARCH");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(0);
  const [approvalThreshold, setApprovalThreshold] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listAgents();
      setAgents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAgent({ name, type, description, budget, approvalThreshold });
      setName("");
      setDescription("");
      setBudget(0);
      setApprovalThreshold(0);
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRun = async (id: string) => {
    try {
      const run = await api.runAgent(id, {});
      setRuns((prev) => ({ ...prev, [id]: [run, ...(prev[id] || [])] }));
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (runId: string, definitionId: string, approved: boolean) => {
    try {
      await api.approveRun(runId, approved, "reviewer");
      load();
      if (expandedId === definitionId) {
        const data = await api.getAgentRuns(definitionId);
        setRuns((prev) => ({ ...prev, [definitionId]: data }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!runs[id]) {
      try {
        const data = await api.getAgentRuns(id);
        setRuns((prev) => ({ ...prev, [id]: data }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white flex items-center gap-2"><Cpu className="w-6 h-6" /> Revenue Agents</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof AGENT_TYPES[number])} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                {AGENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Budget (units)</label>
              <input type="number" min="0" value={budget} onChange={(e) => setBudget(parseInt(e.target.value, 10))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Approval Threshold</label>
              <input type="number" min="0" value={approvalThreshold} onChange={(e) => setApprovalThreshold(parseInt(e.target.value, 10))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Create Agent</button>
        </form>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Loading agents...</div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{agent.name} <span className="text-slate-500 text-xs font-normal">({agent.type})</span></div>
                  <div className="text-xs text-slate-400 mt-1">{agent.description}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Budget {agent.budget} · Spent {agent.spentBudget} · Threshold {agent.approvalThreshold} · Runs {agent._count?.runs ?? 0}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRun(agent.id)} title="Run" className="p-2 rounded-lg hover:bg-green-900/40 text-green-400"><Play className="w-4 h-4" /></button>
                  <button onClick={() => toggleExpand(agent.id)} title="History" className="p-2 rounded-lg hover:bg-slate-800 text-slate-300"><RefreshCw className={`w-4 h-4 ${expandedId === agent.id ? "animate-spin" : ""}`} /></button>
                  <button onClick={async () => { await api.deleteAgent(agent.id); load(); }} title="Delete" className="p-2 rounded-lg hover:bg-red-900/40 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expandedId === agent.id && (
                <div className="border-t border-slate-800 px-5 py-4 bg-slate-900/20">
                  <div className="text-xs font-bold text-slate-300 mb-2">Recent Runs</div>
                  <div className="space-y-2">
                    {(runs[agent.id] || []).map((run) => (
                      <div key={run.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3">
                        <div className="flex-1">
                          <div className="text-xs font-bold text-white">{run.status} · Cost {run.cost}</div>
                          <div className="text-[10px] text-slate-400 mt-1 max-w-xl">{JSON.stringify(run.output).slice(0, 300)}</div>
                          {run.approvals.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <ShieldCheck className="w-3 h-3 text-yellow-400" />
                              <span className="text-[10px] text-yellow-400 font-bold">Approval {run.approvals[0].status}</span>
                              {run.status === "AWAITING_APPROVAL" && (
                                <>
                                  <button onClick={() => handleApprove(run.id, agent.id, true)} className="text-[10px] bg-green-900/40 text-green-400 px-2 py-1 rounded-lg">Approve</button>
                                  <button onClick={() => handleApprove(run.id, agent.id, false)} className="text-[10px] bg-red-900/40 text-red-400 px-2 py-1 rounded-lg">Reject</button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(runs[agent.id] || []).length === 0 && (
                      <div className="text-xs text-slate-500">No runs yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {agents.length === 0 && !loading && (
            <div className="text-slate-500 text-sm">No agents yet. Create one to automate research, routing, briefing, follow-up, or CRM hygiene.</div>
          )}
        </div>
      )}
    </div>
  );
};
