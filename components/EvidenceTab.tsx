import React, { useState, useEffect } from 'react';
import { api } from '../services/apiClient';
import type { Phase4EvidenceReview } from '../types';

const EvidenceTab: React.FC = () => {
  const [reviews, setReviews] = useState<Phase4EvidenceReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ entityType: 'ACCOUNT_RANK', entityId: '', recommendation: '', sources: '[]', confidence: 0.8, freshness: 0 });

  const loadReviews = async () => {
    setLoading(true);
    try {
      const result = await api<Phase4EvidenceReview[]>('/evidence');
      setReviews(result);
    } catch (err) {
      console.error('Failed to load evidence reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/evidence', { method: 'POST', body: JSON.stringify({ ...form, sources: JSON.parse(form.sources) }) });
      setForm({ entityType: 'ACCOUNT_RANK', entityId: '', recommendation: '', sources: '[]', confidence: 0.8, freshness: 0 });
      loadReviews();
    } catch (err) {
      console.error('Failed to create evidence review:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api(`/evidence/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ comment: 'Approved' }) });
      loadReviews();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api(`/evidence/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ comment: 'Rejected' }) });
      loadReviews();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-amber-400';
      case 'APPROVED': return 'text-emerald-400';
      case 'REJECTED': return 'text-red-400';
      case 'DECAYED': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">Create Evidence Review</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Entity Type</label>
            <select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="ACCOUNT_RANK">ACCOUNT_RANK</option>
              <option value="PLAYBOOK_STEP">PLAYBOOK_STEP</option>
              <option value="SEQUENCE_VARIANT">SEQUENCE_VARIANT</option>
              <option value="PITCH">PITCH</option>
              <option value="AGENT_RUN">AGENT_RUN</option>
              <option value="SIGNAL">SIGNAL</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Entity ID</label>
            <input value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recommendation</label>
            <input value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confidence (0-1)</label>
            <input type="number" step="0.01" min="0" max="1" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: parseFloat(e.target.value) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Freshness (days)</label>
            <input type="number" min="0" value={form.freshness} onChange={(e) => setForm({ ...form, freshness: parseInt(e.target.value, 10) })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sources (JSON)</label>
            <textarea value={form.sources} onChange={(e) => setForm({ ...form, sources: e.target.value })} rows={2} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider">Create Review</button>
          </div>
        </form>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Pending Reviews ({reviews.filter(r => r.status === 'PENDING').length})</h3>
          <button onClick={loadReviews} disabled={loading} className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-200">{review.recommendation}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor(review.status)}`}>{review.status}</span>
              </div>
              <div className="text-[10px] text-slate-500 mb-2">
                {review.entityType} · {review.entityId.slice(0, 8)}... · confidence {review.confidence.toFixed(2)} · freshness {review.freshness}d
              </div>
              <div className="text-[10px] text-slate-400 mb-2">
                by {review.createdByName} on {new Date(review.createdAt).toLocaleString()}
              </div>
              {review.reviewedByName && (
                <div className="text-[10px] text-slate-400 mb-2">
                  reviewed by {review.reviewedByName}: {review.comment}
                </div>
              )}
              {review.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(review.id)} className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">Approve</button>
                  <button onClick={() => handleReject(review.id)} className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider">Reject</button>
                </div>
              )}
            </div>
          ))}
          {reviews.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No evidence reviews found</div>}
        </div>
      </div>
    </div>
  );
};

export default EvidenceTab;
