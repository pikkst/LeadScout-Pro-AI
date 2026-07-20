import React from 'react';
import { OutreachPitch, PitchEvent } from '../types';
import * as crm from '../services/crmService';
import { SendHorizontal, Sparkles, Edit2, Trash2, Send, Inbox, RefreshCw } from 'lucide-react';

export interface OutreachTabProps {
  pitches: OutreachPitch[];
  sendingPitchIds: Set<string>;
  isGeneratingPitches: boolean;
  pitchProgress: { current: number; total: number; activeName: string };
  onBulkSend: () => void;
  onOpenPreview: (pitch: OutreachPitch) => void;
  onDeletePitch: (id: string) => void;
  onSendPitch: (id: string) => void;
  onMarkReplied: (pitchId: string, leadId: string, leadName: string) => void;
  onNavigateToScout: () => void;
}

export const OutreachTab: React.FC<OutreachTabProps> = ({
  pitches,
  sendingPitchIds,
  isGeneratingPitches,
  pitchProgress,
  onBulkSend,
  onOpenPreview,
  onDeletePitch,
  onSendPitch,
  onMarkReplied,
  onNavigateToScout,
}) => {
  const [expandedPitchId, setExpandedPitchId] = React.useState<string | null>(null);
  const [eventsMap, setEventsMap] = React.useState<Record<string, PitchEvent[]>>({});
  const [loadingEvents, setLoadingEvents] = React.useState<Record<string, boolean>>({});

  const sentOrDeliveredPitches = pitches.filter(
    p => p.status === 'Sent' || p.status === 'Delivered' || p.status === 'Replied'
  );

  const loadEvents = async (pitchId: string) => {
    setLoadingEvents(prev => ({ ...prev, [pitchId]: true }));
    try {
      const events = await crm.fetchPitchEvents(pitchId);
      setEventsMap(prev => ({ ...prev, [pitchId]: events }));
    } catch (err) {
      console.error('Failed to load pitch events:', err);
    } finally {
      setLoadingEvents(prev => ({ ...prev, [pitchId]: false }));
    }
  };

  const toggleEvents = (pitchId: string) => {
    if (expandedPitchId === pitchId) {
      setExpandedPitchId(null);
    } else {
      setExpandedPitchId(pitchId);
      if (!eventsMap[pitchId]) {
        loadEvents(pitchId);
      }
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'SENT': return '📤';
      case 'DELIVERED': return '📥';
      case 'OPENED': return '👁️';
      case 'CLICKED': return '🖱️';
      case 'REPLIED': return '💬';
      case 'BOUNCED': return '⚠️';
      case 'FAILED': return '❌';
      default: return '📋';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'SENT': return 'text-sky-400';
      case 'DELIVERED': return 'text-emerald-400';
      case 'OPENED': return 'text-purple-400';
      case 'CLICKED': return 'text-amber-400';
      case 'REPLIED': return 'text-emerald-400';
      case 'BOUNCED': return 'text-rose-400';
      case 'FAILED': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-slate-950/30 border border-slate-850 rounded-2xl p-6 min-h-[550px] flex flex-col relative shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-850">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
              AI Partnership Email Pitch Drafts
              {pitches.length > 0 && (
                <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2.5 py-1 rounded-full border border-purple-500/20 font-mono font-bold">
                  {pitches.length} DRAFTS FORMULATED
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Review, customize, and execute automated SMTP transmissions on behalf of your company.</p>
          </div>

          {pitches.length > 0 && (
            <button
              onClick={onBulkSend}
              className="flex items-center gap-2 text-[10px] bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors shadow-lg shadow-sky-950/20"
            >
              <SendHorizontal className="w-3.5 h-3.5" />
              Bulk Send All Drafts
            </button>
          )}
        </div>

        {pitches.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 text-slate-500 border border-dashed border-slate-850 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-850 shadow-inner">
              <Sparkles className="w-8 h-8 text-slate-700 animate-bounce" />
            </div>
            <h3 className="text-slate-300 font-bold text-base mb-1.5">No Drafts Formulated Yet</h3>
            <p className="max-w-md text-xs opacity-60 leading-relaxed mb-6">
              Select one or more active targets on the <strong>AI Partner Scout</strong> tab, choose your preferred localized language on the left Outreach control panel, and click "Draft Custom Pitch" to load drafts here.
            </p>
            <button
              onClick={onNavigateToScout}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-4 py-2 rounded-lg font-bold uppercase transition-colors"
            >
              Browse Partners
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pitches.map((pitch) => (
              <div
                key={pitch.id}
                className="bg-slate-900/60 border border-slate-850 rounded-xl p-5 flex flex-col justify-between hover:border-slate-750 transition-all shadow-md hover:shadow-lg relative overflow-hidden"
              >
                {pitch.status !== 'Draft' && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-sky-500" />
                )}

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] bg-slate-850 border border-slate-800 px-2.5 py-0.5 rounded text-slate-400 font-mono font-bold uppercase">
                      Language: {pitch.language}
                    </span>

                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                      pitch.status === 'Draft'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : pitch.status === 'Replied'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {pitch.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-sm line-clamp-1 mb-1">{pitch.leadName}</h3>
                  <p className="text-[10px] text-slate-500 mb-4 truncate">{pitch.leadEmail}</p>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/80 mb-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</div>
                    <div className="text-xs font-mono text-slate-300 line-clamp-1">{pitch.subject}</div>
                  </div>

                  {pitch.events && pitch.events.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Event Timeline</div>
                      {pitch.events.slice(0, 4).map((event) => (
                        <div key={event.id} className="flex items-center gap-2 text-[10px]">
                          <span>{getEventIcon(event.type)}</span>
                          <span className={`font-mono ${getEventColor(event.type)}`}>{event.type}</span>
                          <span className="text-slate-500">
                            {new Date(event.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-850">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onOpenPreview(pitch)}
                        className="p-2 text-slate-400 hover:text-sky-400 bg-slate-950 rounded-lg hover:bg-slate-900 border border-slate-850 transition-all"
                        title="Edit Subject / Body and Preview HTML"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePitch(pitch.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 bg-slate-950 rounded-lg hover:bg-slate-900 border border-slate-850 transition-all"
                        title="Discard draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Generate B variant for A/B testing?')) return;
                          try {
                            const variant = await crm.generateAndSavePitch(pitch.leadId, '', pitch.language);
                            if (onOpenPreview) onOpenPreview(variant);
                          } catch (err) {
                            console.error('Failed to generate B variant:', err);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-purple-400 bg-slate-950 rounded-lg hover:bg-slate-900 border border-slate-850 transition-all"
                        title="Generate B variant for A/B testing"
                      >
                        <span className="text-[9px] font-bold">A/B</span>
                      </button>
                    </div>

                  {pitch.status === 'Draft' || pitch.status === 'Failed' ? (
                    <button
                      onClick={() => onSendPitch(pitch.id)}
                      disabled={sendingPitchIds.has(pitch.id)}
                      className="flex items-center gap-1.5 text-[10px] bg-sky-600/10 hover:bg-sky-600/25 disabled:opacity-50 text-sky-400 border border-sky-500/20 px-3 py-2 rounded-lg font-bold uppercase transition-all"
                    >
                      <Send className="w-3 h-3" />
                      {sendingPitchIds.has(pitch.id) ? 'Sending…' : pitch.status === 'Failed' ? 'Retry Send' : 'Send Email'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Sent {pitch.sentAt ? new Date(pitch.sentAt).toLocaleString() : 'N/A'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {sentOrDeliveredPitches.length > 0 && (
        <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Inbox className="w-4 h-4 text-purple-400" />
            Sent Outreach Tracking
          </h3>
          <p className="text-xs text-slate-400">
            Emails sent to carriers via SMTP. When a partner replies, mark it here to advance the lead to Negotiation.
          </p>

          <div className="space-y-3">
            {sentOrDeliveredPitches.map(p => (
              <div key={p.id} className="bg-slate-900/80 border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm">{p.leadName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{p.leadEmail}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${p.status === 'Replied' ? 'text-purple-400' : 'text-emerald-400'}`}>
                    {p.status}
                  </span>
                </div>

                {p.status !== 'Replied' && (
                  <button
                    type="button"
                    onClick={() => onMarkReplied(p.id, p.leadId, p.leadName)}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] px-4 py-2 rounded-lg uppercase tracking-wider whitespace-nowrap transition-colors"
                  >
                    Mark as Replied
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
