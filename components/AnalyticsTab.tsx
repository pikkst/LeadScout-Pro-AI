import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Users, Target, DollarSign, Activity } from 'lucide-react';

interface ForecastData {
  current: {
    totalLeads: number;
    totalValue: number;
    byStage: Record<string, { count: number; value: number }>;
  };
  forecast: {
    next30Days: {
      estimatedDeals: number;
      estimatedValue: number;
    };
  };
  performance: {
    recentDeals: number;
    recentRevenue: number;
    avgDealSize: number;
    avgCommissionRate: number;
  };
}

interface ConversionData {
  segment: string;
  total: number;
  signed: number;
  active: number;
  conversionRate: number;
}

interface AgentPerformance {
  id: string;
  name: string;
  totalLeads: number;
  byStage: Record<string, number>;
  deals: number;
  totalDealValue: number;
  totalCommission: number;
}

const AnalyticsTab: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [conversion, setConversion] = useState<ConversionData[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [forecastRes, conversionRes, agentRes] = await Promise.all([
        fetch('/api/stats/forecast'),
        fetch('/api/stats/conversion'),
        fetch('/api/stats/agent-performance'),
      ]);
      const [forecastData, conversionData, agentData] = await Promise.all([
        forecastRes.json(),
        conversionRes.json(),
        agentRes.json(),
      ]);
      setForecast(forecastData);
      setConversion(conversionData);
      setAgentPerformance(agentData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('et-EE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      DISCOVERED: 'Discovered',
      CONTACTED: 'Contacted',
      NEGOTIATION: 'Negotiation',
      SIGNED: 'Signed',
      ACTIVE: 'Active',
      ARCHIVED: 'Archived',
    };
    return labels[stage] || stage;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Forecast Section */}
      {forecast && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Current Pipeline</h3>
            </div>
            <div className="text-3xl font-black text-white">{forecast.current.totalLeads}</div>
            <div className="text-xs text-slate-500 mt-1">
              {formatCurrency(forecast.current.totalValue)} total value
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">30-Day Forecast</h3>
            </div>
            <div className="text-3xl font-black text-white">{forecast.forecast.next30Days.estimatedDeals}</div>
            <div className="text-xs text-slate-500 mt-1">
              {formatCurrency(forecast.forecast.next30Days.estimatedValue)} estimated
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Avg Deal Size</h3>
            </div>
            <div className="text-3xl font-black text-white">{formatCurrency(forecast.performance.avgDealSize)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {forecast.performance.recentDeals} deals closed recently
            </div>
          </div>
        </div>
      )}

      {/* Pipeline by Stage */}
      {forecast && (
        <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            Pipeline by Stage
          </h3>
          <div className="space-y-3">
            {Object.entries(forecast.current.byStage).map(([stage, data]) => (
              <div key={stage} className="flex items-center gap-4">
                <div className="w-32 text-xs font-medium text-slate-400">
                  {getStageLabel(stage)}
                </div>
                <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (data.count / forecast.current.totalLeads) * 100)}%`,
                    }}
                  />
                </div>
                <div className="w-16 text-right text-xs font-bold text-white">
                  {data.count}
                </div>
                <div className="w-24 text-right text-xs text-slate-400">
                  {formatCurrency(data.value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Conversion by Segment */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-emerald-400" />
          Conversion by Segment
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Segment</th>
                <th className="pb-3 font-semibold text-right">Total</th>
                <th className="pb-3 font-semibold text-right">Signed</th>
                <th className="pb-3 font-semibold text-right">Active</th>
                <th className="pb-3 font-semibold text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {conversion.map((item) => (
                <tr key={item.segment} className="hover:bg-slate-900/30">
                  <td className="py-3 text-slate-200 font-medium capitalize">
                    {item.segment.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 text-right text-slate-300">{item.total}</td>
                  <td className="py-3 text-right text-emerald-400">{item.signed}</td>
                  <td className="py-3 text-right text-sky-400">{item.active}</td>
                  <td className="py-3 text-right">
                    <span className={`font-bold ${item.conversionRate > 30 ? 'text-emerald-400' : item.conversionRate > 15 ? 'text-amber-400' : 'text-red-400'}`}>
                      {item.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {conversion.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No conversion data yet. Add leads and move them through stages to see analytics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Agent Performance */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-purple-400" />
          Agent Performance
        </h3>
        <div className="space-y-4">
          {agentPerformance.map((agent) => (
            <div key={agent.id} className="bg-slate-900/50 border border-slate-850 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">{agent.name}</div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400">{agent.totalLeads} leads</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(agent.totalDealValue)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(agent.byStage).map(([stage, count]) => (
                  <span
                    key={stage}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300"
                  >
                    {getStageLabel(stage)}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {agentPerformance.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs">
              No agent data available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AnalyticsTab;
