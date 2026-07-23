import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ShieldCheck, AlertTriangle, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { DealQueue, QueueItem, WorkloadCap } from '../types';
import * as crm from '../services/crmService';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-800 text-slate-300',
  MEDIUM: 'bg-sky-900/30 text-sky-300',
  HIGH: 'bg-amber-900/30 text-amber-300',
  CRITICAL: 'bg-rose-900/30 text-rose-300',
};

export const QueuesTab: React.FC = () => {
  const [queues, setQueues] = useState<DealQueue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<DealQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQueueForm, setShowQueueForm] = useState(false);
  const [queueName, setQueueName] = useState('');
  const [queueType, setQueueType] = useState('approvals');
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemNotes, setItemNotes] = useState('');
  const [itemPriority, setItemPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [workload, setWorkload] = useState<WorkloadCap | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = await crm.listDealQueues();
      setQueues(qs);
      const wl = await crm.getMyWorkloadCap();
      setWorkload(wl);
    } catch (err) {
      console.error('Failed to load queues:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueName.trim()) return;
    try {
      await crm.createDealQueue({ name: queueName, description: '', type: queueType, isActive: true });
      setQueueName('');
      setShowQueueForm(false);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const loadQueueItems = async (queue: DealQueue) => {
    setSelectedQueue(queue);
    try {
      const items = await crm.listQueueItems({ queueId: queue.id });
      setSelectedQueue({ ...queue, items });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueue) return;
    try {
      await crm.createQueueItem({
        queueId: selectedQueue.id,
        notes: itemNotes,
        priority: itemPriority,
      });
      setItemNotes('');
      setShowItemForm(false);
      await loadQueueItems(selectedQueue);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const resolveItem = async (item: QueueItem) => {
    try {
      await crm.updateQueueItem(item.id, { status: 'RESOLVED', resolvedAt: new Date().toISOString() });
      if (selectedQueue) await loadQueueItems(selectedQueue);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Manager Queues</h2>
          <p className="text-xs text-slate-500 mt-1">Approvals, stalled deals, handoffs, and SLA breaches.</p>
        </div>
        <div className="flex items-center gap-3">
          {workload && (
            <div className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
              Load: {workload.currentLoad} / {workload.maxActiveLeads} leads · {workload.alertThreshold * 100}% threshold
            </div>
          )}
          <button
            onClick={() => setShowQueueForm(!showQueueForm)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Queue
          </button>
        </div>
      </div>

      {showQueueForm && (
        <form onSubmit={handleCreateQueue} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
              <input value={queueName} onChange={(e) => setQueueName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" placeholder="e.g. Deal Desk Approvals" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
              <select value={queueType} onChange={(e) => setQueueType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                <option value="approvals">Approvals</option>
                <option value="stalled">Stalled Deals</option>
                <option value="handoffs">Handoffs</option>
                <option value="sla_breach">SLA Breaches</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-colors">Create</button>
            <button type="button" onClick={() => setShowQueueForm(false)} className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold rounded-lg transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500 text-xs">Loading queues...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map(queue => (
            <div key={queue.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{queue.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{queue.type}</div>
                </div>
                <div className="text-[10px] text-slate-400 bg-slate-950 border border-slate-800 rounded-full px-2 py-1">{queue.items?.length || 0} items</div>
              </div>
              <button
                onClick={() => loadQueueItems(queue)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg hover:text-white hover:border-slate-700 transition-colors"
              >
                View Items
              </button>
              {selectedQueue?.id === queue.id && selectedQueue.items && (
                <div className="space-y-2 mt-2 border-t border-slate-800 pt-3">
                  {selectedQueue.items.map(item => (
                    <div key={item.id} className="flex items-start justify-between bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-white truncate">{item.notes || 'Unnamed item'}</div>
                        <div className="text-[9px] text-slate-500">{item.priority} · Status: {item.status}</div>
                      </div>
                      {item.status === 'OPEN' && (
                        <button onClick={() => resolveItem(item)} className="ml-2 p-1 rounded text-emerald-400 hover:text-white hover:bg-emerald-950/40 border border-emerald-500/20 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {selectedQueue.items.length === 0 && (
                    <div className="text-[10px] text-slate-500 italic">No items in this queue.</div>
                  )}
                  <button
                    onClick={() => setShowItemForm(!showItemForm)}
                    className="w-full px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3 inline mr-1" /> Add Item
                  </button>
                  {showItemForm && (
                    <form onSubmit={handleCreateItem} className="space-y-2">
                      <textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" rows={2} placeholder="Item notes..." />
                      <select value={itemPriority} onChange={(e) => setItemPriority(e.target.value as typeof itemPriority)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded-lg transition-colors">Add</button>
                        <button type="button" onClick={() => setShowItemForm(false)} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold rounded-lg transition-colors">Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
          {queues.length === 0 && !loading && (
            <div className="text-center p-8 text-slate-500 text-xs italic col-span-full">No queues configured yet.</div>
          )}
        </div>
      )}
    </div>
  );
};
