import React, { useEffect, useState, useCallback } from 'react';
import { FollowUpSequence, SequenceExecution } from '../types';
import * as crm from '../services/crmService';
import { Play, Square, Loader2 } from 'lucide-react';

interface SequenceSectionProps {
  leadId: string;
  leadStage: string;
}

export const SequenceSection: React.FC<SequenceSectionProps> = ({ leadId, leadStage }) => {
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [executions, setExecutions] = useState<SequenceExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const [seqs, execs] = await Promise.all([crm.listSequences(), crm.getLeadSequences(leadId)]);
      setSequences(seqs);
      setExecutions(execs);
    } catch (err) {
      console.error('Failed to load sequences:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async (sequenceId: string) => {
    setStarting(sequenceId);
    try {
      await crm.startSequence(sequenceId, leadId);
      await load();
    } catch (err) {
      console.error('Failed to start sequence:', err);
    } finally {
      setStarting(null);
    }
  };

  const handleStop = async (sequenceId: string) => {
    setStarting(sequenceId);
    try {
      await crm.stopSequence(sequenceId, leadId);
      await load();
    } catch (err) {
      console.error('Failed to stop sequence:', err);
    } finally {
      setStarting(null);
    }
  };

  const activeExecutions = executions.filter(e => e.status === 'ACTIVE');

  return (
    <div className="bg-slate-950/40 border border-sky-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            Follow-up Sequences
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Automate follow-ups based on lead stage.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-4 text-slate-500 text-xs">Loading...</div>
      ) : (
        <div className="space-y-3">
          {/* Active executions */}
          {activeExecutions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Sequences</p>
              {activeExecutions.map(exec => (
                <div key={exec.id} className="flex items-center justify-between bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-xs font-bold text-sky-400">{exec.sequence?.name || 'Unknown Sequence'}</div>
                    <div className="text-[10px] text-slate-500">Step {exec.currentStep + 1} · Next: {exec.nextRunAt ? new Date(exec.nextRunAt).toLocaleDateString() : 'Pending'}</div>
                  </div>
                  <button
                    onClick={() => handleStop(exec.sequenceId)}
                    disabled={starting === exec.sequenceId}
                    className="p-2 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/20 transition-colors"
                    title="Stop sequence"
                  >
                    {starting === exec.sequenceId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Available sequences */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Sequences</p>
            {sequences
              .filter(s => s.triggerStage === leadStage && s.isActive)
              .map(seq => {
                const isActive = activeExecutions.some(e => e.sequenceId === seq.id);
                return (
                  <div key={seq.id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-xs font-bold text-white">{seq.name}</div>
                      <div className="text-[10px] text-slate-500">{seq.steps?.length || 0} steps</div>
                    </div>
                    {isActive ? (
                      <button
                        onClick={() => handleStop(seq.id)}
                        disabled={starting === seq.id}
                        className="px-3 py-1.5 text-[10px] font-bold bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800/50 text-rose-400 rounded-lg transition-colors flex items-center gap-1"
                      >
                        {starting === seq.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(seq.id)}
                        disabled={starting === seq.id}
                        className="px-3 py-1.5 text-[10px] font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        {starting === seq.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Start
                      </button>
                    )}
                  </div>
                );
              })}
            {sequences.filter(s => s.triggerStage === leadStage && s.isActive).length === 0 && (
              <p className="text-[10px] text-slate-500 italic">No sequences available for this stage.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
