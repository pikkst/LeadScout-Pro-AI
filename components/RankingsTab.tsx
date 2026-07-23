import React, { useEffect, useState, useCallback } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Phase3AccountRank } from '../types';
import * as api from '../services/phase3Api';

export const RankingsTab: React.FC = () => {
  const [ranks, setRanks] = useState<Phase3AccountRank[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listAccountRankings({ limit: 50 });
      setRanks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white flex items-center gap-2"><TrendingUp className="w-6 h-6" /> Account Rankings</h2>
        <button onClick={load} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading rankings...</div>
      ) : (
        <div className="space-y-3">
          {ranks.map((rank) => (
            <div key={rank.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{rank.account?.name ?? `Account ${rank.accountId}`}</div>
                  <div className="text-xs text-slate-400 mt-1">{rank.account?.domain ?? ""} {rank.account?.industry ? `· ${rank.account.industry}` : ""}</div>
                </div>
                <div className={`text-2xl font-black ${scoreColor(rank.compositeScore)}`}>{rank.compositeScore}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold">FIT</div>
                  <div className="text-sm font-bold text-white">{rank.fitScore}</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold">TIMING</div>
                  <div className="text-sm font-bold text-white">{rank.timingScore}</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold">RELATIONSHIP</div>
                  <div className="text-sm font-bold text-white">{rank.relationshipScore}</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold">VALUE</div>
                  <div className="text-sm font-bold text-white">{rank.valueScore}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400">{rank.explanation}</div>
            </div>
          ))}
          {ranks.length === 0 && !loading && (
            <div className="text-slate-500 text-sm">No rankings yet. Ingest signals to start ranking accounts.</div>
          )}
        </div>
      )}
    </div>
  );
};
