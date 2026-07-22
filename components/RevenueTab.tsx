import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Award, Calendar, Filter } from 'lucide-react';
import { api } from '../services/apiClient';

interface Deal {
  id: string;
  value: number;
  commissionRate: number;
  commission: number;
  closedAt: string;
  notes: string;
  lead: { name: string };
  agent: { name: string };
}

interface Stats {
  totalDeals: number;
  monthDeals: number;
  yearDeals: number;
  totalRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  totalCommission: number;
  monthCommission: number;
  yearCommission: number;
}

interface AgentStats {
  id: string;
  name: string;
  deals: number;
  revenue: number;
  commission: number;
}

const RevenueTab: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leaderboard, setLeaderboard] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState('');

  useEffect(() => {
    loadData();
  }, [filterAgent]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, dealsData, leaderboardData] = await Promise.all([
        api<Stats>('/revenue/stats'),
        api<Deal[]>(`/revenue/deals${filterAgent ? `?agentId=${filterAgent}` : ''}`),
        api<AgentStats[]>('/revenue/leaderboard'),
      ]);
      setStats(statsData);
      setDeals(dealsData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading revenue data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Total Revenue</h3>
            </div>
            <div className="text-3xl font-black text-white">{formatCurrency(stats.totalRevenue)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.totalDeals} deals closed
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">This Month</h3>
            </div>
            <div className="text-3xl font-black text-white">{formatCurrency(stats.monthRevenue)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.monthDeals} deals
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Commissions</h3>
            </div>
            <div className="text-3xl font-black text-white">{formatCurrency(stats.totalCommission)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {formatCurrency(stats.monthCommission)} this month
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Agent Leaderboard
        </h3>
        <div className="space-y-3">
          {leaderboard.map((agent, index) => (
            <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{agent.name}</div>
                  <div className="text-xs text-slate-500">{agent.deals} deals</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-400">{formatCurrency(agent.revenue)}</div>
                <div className="text-xs text-amber-400">{formatCurrency(agent.commission)} commission</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Deals Table */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-sky-400" />
            Closed Deals
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-slate-500" />
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <option value="">All Agents</option>
              {leaderboard.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Lead</th>
                <th className="pb-3 font-semibold">Agent</th>
                <th className="pb-3 font-semibold text-right">Value</th>
                <th className="pb-3 font-semibold text-right">Commission</th>
                <th className="pb-3 font-semibold text-right">Rate</th>
                <th className="pb-3 font-semibold">Closed</th>
                <th className="pb-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-slate-900/30">
                  <td className="py-3 text-slate-200 font-medium">{deal.lead.name}</td>
                  <td className="py-3 text-slate-300">{deal.agent.name}</td>
                  <td className="py-3 text-right text-emerald-400 font-bold">{formatCurrency(deal.value)}</td>
                  <td className="py-3 text-right text-amber-400 font-bold">{formatCurrency(deal.commission)}</td>
                  <td className="py-3 text-right text-slate-400">{deal.commissionRate}%</td>
                  <td className="py-3 text-slate-400">{formatDate(deal.closedAt)}</td>
                  <td className="py-3 text-slate-500 max-w-xs truncate">{deal.notes || '-'}</td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No deals closed yet. Close a deal from the CRM to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RevenueTab;
