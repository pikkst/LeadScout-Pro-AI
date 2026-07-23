import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Check, X, RefreshCw, Signal } from 'lucide-react';
import { Phase3Signal } from '../types';
import * as api from '../services/phase3Api';

const SIGNAL_TYPES = ["HIRING", "FUNDING", "LEADERSHIP_CHANGE", "TECHNOLOGY", "INTENT", "PRODUCT_USAGE", "RENEWAL", "RELATIONSHIP_ACTIVITY"] as const;

export const SignalsTab: React.FC = () => {
  const [signals, setSignals] = useState<Phase3Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<typeof SIGNAL_TYPES[number]>("INTENT");
  const [source, setSource] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confidence, setConfidence] = useState(0.5);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listSignals({ limit: 50 });
      setSignals(data);
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
      await api.ingestSignalSignal({ type, source, evidence, confidence });
      setSource("");
      setEvidence("");
      setConfidence(0.5);
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (id: string, verified: boolean) => {
    try {
      await api.verifySignal(id, verified);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSignal(id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white flex items-center gap-2"><Signal className="w-6 h-6" /> Signals</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Ingest Signal
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof SIGNAL_TYPES[number])} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm">
                {SIGNAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Source</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. news-api, crunchbase" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Confidence</label>
              <input type="number" min="0" max="1" step="0.01" value={confidence} onChange={(e) => setConfidence(parseFloat(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Evidence</label>
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm" required />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Ingest</button>
        </form>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Loading signals...</div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-4">
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{signal.type} · {signal.source}</div>
                <div className="text-xs text-slate-400 mt-1 max-w-2xl line-clamp-2">{signal.evidence}</div>
                <div className="text-[10px] text-slate-500 mt-1">Confidence: {Math.round(signal.confidence * 100)}% · {new Date(signal.ingestedAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                {!signal.isVerified ? (
                  <button onClick={() => handleVerify(signal.id, true)} title="Verify" className="p-2 rounded-lg hover:bg-green-900/40 text-green-400"><Check className="w-4 h-4" /></button>
                ) : (
                  <span className="text-xs text-green-400 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Verified</span>
                )}
                <button onClick={() => handleDelete(signal.id)} title="Delete" className="p-2 rounded-lg hover:bg-red-900/40 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {signals.length === 0 && !loading && (
            <div className="text-slate-500 text-sm">No signals yet. Ingest your first signal to start ranking accounts.</div>
          )}
        </div>
      )}
    </div>
  );
};
