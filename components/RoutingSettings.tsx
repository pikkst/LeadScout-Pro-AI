import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Grip, Play, Settings } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface RoutingRule {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  ruleType: string;
  criteria: string;
  assignedAgent: Agent;
}

const RoutingSettings: React.FC = () => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ruleType: 'TERRITORY',
    assignedAgentId: '',
    priority: 0,
    isActive: true,
    criteria: '{}',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, usersRes] = await Promise.all([
        fetch('/api/routing/rules'),
        fetch('/api/auth/users'),
      ]);
      const [rulesData, usersData] = await Promise.all([
        rulesRes.json(),
        usersRes.json(),
      ]);
      setRules(rulesData);
      setAgents(usersData.filter((u: Agent) => u.role !== 'ADMIN'));
    } catch (error) {
      console.error('Failed to load routing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRule ? `/api/routing/rules/${editingRule.id}` : '/api/routing/rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadData();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this routing rule?')) return;
    try {
      await fetch(`/api/routing/rules/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleEdit = (rule: RoutingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      assignedAgentId: rule.assignedAgent.id,
      priority: rule.priority,
      isActive: rule.isActive,
      criteria: rule.criteria,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ruleType: 'TERRITORY',
      assignedAgentId: '',
      priority: 0,
      isActive: true,
      criteria: '{}',
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      TERRITORY: 'Territory',
      INDUSTRY: 'Industry',
      ROUND_ROBIN: 'Round Robin',
      MANUAL: 'Manual',
      SCORE_BASED: 'Score Based',
    };
    return labels[type] || type;
  };

  const getCriteriaLabel = (rule: RoutingRule) => {
    try {
      const criteria = JSON.parse(rule.criteria);
      const parts = [];
      if (criteria.territory) parts.push(`Territory: ${criteria.territory}`);
      if (criteria.focus) parts.push(`Industry: ${criteria.focus}`);
      if (criteria.maxLeads) parts.push(`Max leads: ${criteria.maxLeads}`);
      if (criteria.minValue) parts.push(`Min value: €${criteria.minValue}`);
      return parts.join(', ') || 'All leads';
    } catch {
      return 'Custom criteria';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading routing rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-400" />
            Lead Routing Rules
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Automatically assign leads to agents based on rules
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Rule
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-4">
            {editingRule ? 'Edit Rule' : 'New Routing Rule'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Rule Type
                </label>
                <select
                  value={formData.ruleType}
                  onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="TERRITORY">Territory</option>
                  <option value="INDUSTRY">Industry</option>
                  <option value="ROUND_ROBIN">Round Robin</option>
                  <option value="SCORE_BASED">Score Based</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Assign To Agent
                </label>
                <select
                  value={formData.assignedAgentId}
                  onChange={(e) => setFormData({ ...formData, assignedAgentId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                >
                  <option value="">Select agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Criteria (JSON)
              </label>
              <textarea
                value={formData.criteria}
                onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                rows={3}
                placeholder='{"territory": "EMEA", "maxLeads": 10}'
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-800"
                />
                <span className="text-xs text-slate-300">Active</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {editingRule ? 'Update' : 'Create'} Rule
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-slate-950/40 border rounded-xl p-4 ${
              rule.isActive ? 'border-slate-800' : 'border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <Grip className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{rule.name}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      rule.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {getRuleTypeLabel(rule.ruleType)} • Priority: {rule.priority} • {getCriteriaLabel(rule)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Agent: {rule.assignedAgent.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(rule)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-slate-900/20 border border-slate-850 rounded-xl">
            No routing rules configured. Add a rule to automatically assign leads to agents.
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutingSettings;
