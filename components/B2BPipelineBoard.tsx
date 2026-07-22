import React, { useState, useMemo } from 'react';
import { CompanyLead, DealStage } from '../types';
import { 
  Building, 
  ArrowRight, 
  Mail, 
  Globe, 
  DollarSign, 
  User, 
  CheckCircle2, 
  ChevronRight, 
  Edit, 
  Trash2, 
  Briefcase, 
  Clock, 
  Activity, 
  ChevronLeft,
  Calendar,
  Layers,
  ArrowUpRight,
  Bell,
  Check,
  X,
  Video,
  ExternalLink,
  CheckSquare,
  Square
} from 'lucide-react';

interface B2BPipelineBoardProps {
  leads: CompanyLead[];
  onEditLead: (lead: CompanyLead) => void;
  onDeleteLead: (id: string) => void;
  onUpdateStage: (id: string, stage: NonNullable<CompanyLead['stage']>) => void;
  onAddLead?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateFollowUpTask: (leadId: string, taskName: string, dueDate: string, isCompleted: boolean, notes: string) => void;
  mineFilter?: boolean;
  onToggleMineFilter?: () => void;
  totalLeadsCount?: number;
  selectedLeadIds?: Set<string>;
  onSelectLead?: (id: string) => void;
  onBulkUpdateStage?: (stage: NonNullable<CompanyLead['stage']>) => void;
  onBulkAssign?: (assignedAgentId: string | null) => void;
  users?: Array<{ id: string; name: string; email: string }>;
  dealStages?: DealStage[];
}

type PipelineStage = { value: string; label: string; icon: string; bg: string; text: string; border: string; desc: string; color?: string; sortOrder: number };

const DEFAULT_STAGES: PipelineStage[] = [
  { 
    value: 'Discovered', 
    label: 'Discovered', 
    icon: '🔍', 
    bg: 'bg-slate-500/10', 
    text: 'text-slate-300', 
    border: 'border-slate-800/80',
    desc: 'Newly scouted carrier partners', sortOrder: 0,
  },
  { 
    value: 'Contacted', 
    label: 'Outreach Sent', 
    icon: '✉️', 
    bg: 'bg-sky-500/10', 
    text: 'text-sky-300', 
    border: 'border-sky-950/80',
    desc: 'Personalized AI pitch sent', sortOrder: 1,
  },
  { 
    value: 'Negotiation', 
    label: 'Negotiation', 
    icon: '🤝', 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-300', 
    border: 'border-amber-950/80',
    desc: 'Price listing & tech discussion', sortOrder: 2,
  },
  { 
    value: 'Signed', 
    label: 'Bilateral Signed', 
    icon: '📜', 
    bg: 'bg-purple-500/10', 
    text: 'text-purple-300', 
    border: 'border-purple-950/80',
    desc: 'Interconnect agreement signed', sortOrder: 3,
  },
  { 
    value: 'Active', 
    label: 'Active Revenue', 
    icon: '📈', 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-300', 
    border: 'border-emerald-950/80',
    desc: 'Live traffic & billing active', sortOrder: 4,
  }
];

export const B2BPipelineBoard: React.FC<B2BPipelineBoardProps> = ({ 
  leads, 
  onEditLead, 
  onDeleteLead, 
  onUpdateStage,
  onAddLead,
  onExportBackup,
  onImportBackup,
  onUpdateFollowUpTask,
  mineFilter,
  onToggleMineFilter,
  totalLeadsCount,
  selectedLeadIds,
  onSelectLead,
  onBulkUpdateStage,
  onBulkAssign,
  users,
  dealStages = [],
}) => {
  const stages = useMemo<PipelineStage[]>(() => {
    const activeCustom = dealStages.filter((stage) => stage.isActive !== false);
    const customByDefault = new Map(activeCustom.map((stage) => [stage.key.toLowerCase(), stage]));
    const defaults = DEFAULT_STAGES.map((stage) => {
      const custom = customByDefault.get(stage.value.toLowerCase());
      return custom
        ? { ...stage, label: custom.name, color: custom.color, sortOrder: custom.sortOrder ?? stage.sortOrder }
        : stage;
    });
    const defaultKeys = new Set(DEFAULT_STAGES.map((stage) => stage.value.toLowerCase()));
    const extras = activeCustom
      .filter((stage) => !defaultKeys.has(stage.key.toLowerCase()))
      .map((stage) => ({
        value: stage.key,
        label: stage.name,
        icon: '•',
        bg: 'bg-slate-500/10',
        text: 'text-slate-200',
        border: 'border-slate-800/80',
        desc: 'Custom pipeline stage',
        color: stage.color,
        sortOrder: stage.sortOrder ?? 100,
      }));
    return [...defaults, ...extras].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dealStages]);
  
  // Scheduler rescheduling states
  const [editingTaskLeadId, setEditingTaskLeadId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Handle opening task rescheduling dialog
  const handleOpenReschedule = (lead: CompanyLead) => {
    setEditingTaskLeadId(lead.id);
    setTaskName(lead.followUpTask?.taskName || "Follow up on initial carrier / customer pitch");
    
    // Set default due date to tomorrow or existing due date (YYYY-MM-DD)
    const existingDue = lead.followUpTask?.dueDate 
      ? new Date(lead.followUpTask.dueDate) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    setTaskDueDate(existingDue.toISOString().split('T')[0]);
    setTaskNotes(lead.followUpTask?.notes || "");
  };

  const handleSaveTaskReschedule = () => {
    if (!editingTaskLeadId) return;
    onUpdateFollowUpTask(
      editingTaskLeadId,
      taskName,
      new Date(taskDueDate).toISOString(),
      false, // Scheduled task is active
      taskNotes
    );
    setEditingTaskLeadId(null);
  };

  // Memoized overdue leads list (> 3 days in Contacted stage)
  const overdueLeads = useMemo(() => {
    return leads.filter(l => {
      if (l.stage !== 'Contacted' || !l.lastContactedAt) return false;
      if (l.followUpTask?.isCompleted) return false;
      const entryDate = new Date(l.lastContactedAt);
      const now = new Date();
      const diffTime = now.getTime() - entryDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays > 3;
    });
  }, [leads]);
  
  // Calculate stats per column
  const getStageStats = (stageVal: NonNullable<CompanyLead['stage']>) => {
    const stageLeads = leads.filter(l => (l.stage || 'Discovered') === stageVal);
    const count = stageLeads.length;
    const totalValue = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    return { count, totalValue };
  };

  const getNextStage = (current: NonNullable<CompanyLead['stage']>): NonNullable<CompanyLead['stage']> | null => {
    const order = stages.map((stage) => stage.value);
    const idx = order.indexOf(current);
    if (idx !== -1 && idx < order.length - 1) {
      return order[idx + 1];
    }
    return null;
  };

  const getPrevStage = (current: NonNullable<CompanyLead['stage']>): NonNullable<CompanyLead['stage']> | null => {
    const order = stages.map((stage) => stage.value);
    const idx = order.indexOf(current);
    if (idx > 0) {
      return order[idx - 1];
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-4 border border-slate-800/60 rounded-xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Interconnection Sales Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Track wholesale partners from discovery through negotiation, contract signoff, and live bilateral traffic.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400">Total Leads:</span>{' '}
            <strong className="text-white">
              {mineFilter && totalLeadsCount ? `${leads.filter(l => l.stage !== 'Archived').length}/${totalLeadsCount}` : leads.filter(l => l.stage !== 'Archived').length}
            </strong>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-sky-400">Weighted Pipe:</span>{' '}
            <strong className="text-emerald-400">
              €{leads
                .filter(l => l.stage !== 'Archived')
                .reduce((acc, l) => acc + (l.estimatedValue || 0), 0)
                .toLocaleString()}
              <span className="text-[10px] text-slate-500 font-sans ml-1">/mo</span>
            </strong>
          </div>
          {onToggleMineFilter && (
            <button
              onClick={onToggleMineFilter}
              className={`text-[10px] border px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
                mineFilter
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {mineFilter ? 'Only Mine' : 'All'}
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeadIds && selectedLeadIds.size > 0 && (
        <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
              {selectedLeadIds.size} selected
            </span>
          </div>
            <div className="flex items-center gap-2">
              {stages.filter(s => s.value !== 'Archived').map(stage => (
                <button
                  key={stage.value}
                  onClick={() => onBulkUpdateStage && onBulkUpdateStage(stage.value)}
                  className="text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg font-bold uppercase transition-colors"
                  title={`Move all selected to ${stage.label}`}
                >
                  {stage.icon} {stage.label}
                </button>
              ))}
              {onBulkAssign && users && users.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onBulkAssign(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg font-bold uppercase transition-colors"
                  defaultValue=""
                >
                  <option value="">Assign To...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                  <option value="null">Unassign</option>
                </select>
              )}
              <button
                onClick={() => {
                  if (onSelectLead) {
                    selectedLeadIds.forEach(id => onSelectLead(id));
                  }
                }}
                className="text-[9px] bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800/50 text-rose-400 px-2.5 py-1.5 rounded-lg font-bold uppercase transition-colors"
              >
                Clear Selection
              </button>
            </div>
        </div>
      )}

      {/* 🚨 Overdue Follow-up Action Center */}
      {overdueLeads.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
                Task-Based Follow-Up Alerts ({overdueLeads.length})
              </h4>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Rule: &gt; 3 days in outreach stage
            </span>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            The following wholesale partners have been in the <strong className="text-sky-400">Outreach Sent</strong> stage for more than 3 days. CRM scheduler protocols suggest an immediate touchpoint or message.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {overdueLeads.map(lead => {
              const daysSinceContact = lead.lastContactedAt ? Math.floor(
                (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
              ) : 0;
              
              return (
                <div key={lead.id} className="bg-slate-950/60 p-4 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors flex flex-col justify-between gap-3 relative overflow-hidden">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-1">
                      <h5 className="text-xs font-bold text-white leading-tight">{lead.name}</h5>
                      <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-mono font-black">
                        {daysSinceContact} DAYS OVERDUE
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 font-medium">
                      Segment: {lead.category.replace(/_/g, ' ').toUpperCase()}
                    </p>

                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-300">
                      <div className="font-bold text-[9px] text-amber-400 uppercase tracking-widest mb-0.5">Active Follow-up Task:</div>
                      <div>{lead.followUpTask?.taskName || 'Initial campaign touchpoint'}</div>
                      {lead.followUpTask?.notes && (
                        <div className="text-slate-500 italic mt-1 font-sans">{lead.followUpTask.notes}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-900">
                    <button
                      onClick={() => {
                        if (lead.followUpTask) {
                          onUpdateFollowUpTask(
                            lead.id,
                            lead.followUpTask.taskName,
                            lead.followUpTask.dueDate,
                            true, // Mark as completed
                            `Resolved: Checked in on wholesale route partnership status.`
                          );
                        } else {
                          onUpdateFollowUpTask(
                            lead.id,
                            "Follow up on initial carrier / customer pitch",
                            new Date().toISOString(),
                            true,
                            "Resolved default task."
                          );
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                    >
                      <Check className="w-3 h-3" />
                      Complete Task
                    </button>
                    <button
                      onClick={() => handleOpenReschedule(lead)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      Postpone
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 lg:grid-flow-col lg:auto-cols-[minmax(240px,1fr)] gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const { count, totalValue } = getStageStats(stage.value);
          const stageLeads = leads.filter(l => (l.stage || 'Discovered') === stage.value);

          return (
            <div 
              key={stage.value} 
              className={`flex flex-col bg-slate-950/40 border border-slate-900 rounded-xl min-w-[240px] max-h-[700px] overflow-hidden`}
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-slate-900 ${stage.bg} flex flex-col gap-1.5`} style={stage.color ? { backgroundColor: `${stage.color}22` } : undefined}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${stage.text}`} style={stage.color ? { color: stage.color } : undefined}>
                    <span className="text-sm">{stage.icon}</span>
                    {stage.label}
                  </span>
                  <span className="bg-slate-900/80 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-mono border border-slate-800">
                    {count}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1">
                  <span>Potential:</span>
                  <span className="text-emerald-400 font-bold">€{totalValue.toLocaleString()}</span>
                </div>
                <span className="text-[9px] text-slate-500 italic mt-1 leading-snug">
                  {stage.desc}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[250px] scrollbar-thin scrollbar-thumb-slate-800">
                {stageLeads.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center text-center p-4">
                    <p className="text-[10px] text-slate-500 italic">No partners here yet.</p>
                  </div>
                ) : (
                  stageLeads.map(lead => {
                    const next = getNextStage(stage.value);
                    const prev = getPrevStage(stage.value);
                    
                    return (
                      <div 
                        key={lead.id}
                        className={`p-3.5 bg-slate-900 border rounded-xl space-y-3 transition-all duration-200 group shadow-md hover:shadow-lg ${
                          selectedLeadIds?.has(lead.id) 
                            ? 'border-sky-500/60 ring-1 ring-sky-500/30' 
                            : 'border-slate-800 hover:border-slate-700/80'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        {onSelectLead && (
                          <div className="flex justify-between items-center">
                            <button
                              type="button"
                              onClick={() => onSelectLead(lead.id)}
                              className="text-slate-500 hover:text-sky-400 transition-colors"
                            >
                              {selectedLeadIds?.has(lead.id) ? (
                                <CheckSquare className="w-4 h-4 text-sky-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            {selectedLeadIds?.has(lead.id) && (
                              <span className="text-[8px] font-bold text-sky-400 uppercase tracking-wider">Selected</span>
                            )}
                          </div>
                        )}

                        {/* Company Identifier */}
                        <div className="flex justify-between items-start gap-1">
                          <div className="space-y-0.5">
                            <h4 
                              onClick={() => onEditLead(lead)}
                              className="text-xs font-bold text-white hover:text-sky-400 transition-colors cursor-pointer line-clamp-1 flex items-center gap-1"
                            >
                              {lead.name}
                              {lead.isVerified && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold line-clamp-1">
                              {lead.category.replace(/_/g, ' ').toUpperCase()}
                            </p>
                          </div>
                          
                           {/* Value Badge */}
                           <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                             €{(lead.estimatedValue || 0).toLocaleString()}
                           </div>
                           {lead.aiScore !== undefined && (
                             <div className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                               AI {lead.aiScore}%
                             </div>
                           )}
                        </div>

                        {/* Summary / Description */}
                        {lead.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                            {lead.description}
                          </p>
                        )}

                        {/* Stage Duration Progress Bar (Time in Current Stage vs 3-day threshold) */}
                        {(() => {
                          const baseDate = lead.lastContactedAt || lead.createdAt || new Date().toISOString();
                          const timeDiff = Date.now() - new Date(baseDate).getTime();
                          const daysSpent = timeDiff / (1000 * 60 * 60 * 24);
                          const thresholdDays = 3;
                          const percentage = Math.min(100, Math.max(0, (daysSpent / thresholdDays) * 100));
                          
                          let durationLabel = '';
                          if (daysSpent < 1) {
                            const hours = Math.round(daysSpent * 24);
                            durationLabel = `${hours}h`;
                          } else {
                            durationLabel = `${daysSpent.toFixed(1)}d`;
                          }

                          const isNearingThreshold = daysSpent >= 2 && daysSpent < 3;
                          const isOverThreshold = daysSpent >= 3;

                          let barColorClass = 'bg-sky-500';
                          let textColorClass = 'text-slate-400';
                          let labelIcon = '⏳';

                          if (isOverThreshold) {
                            barColorClass = 'bg-rose-500 animate-pulse';
                            textColorClass = 'text-rose-400 font-bold';
                            labelIcon = '⚠️';
                          } else if (isNearingThreshold) {
                            barColorClass = 'bg-amber-500';
                            textColorClass = 'text-amber-400 font-semibold';
                            labelIcon = '⏰';
                          }

                          return (
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                                  <span>{labelIcon}</span> Stage Age
                                </span>
                                <span className={`${textColorClass} font-mono`}>
                                  {durationLabel} / {thresholdDays}d limit
                                </span>
                              </div>
                              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-850/60">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Contacts & Metadata */}
                        <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate" title={lead.email}>{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                              <span className="text-slate-500 font-sans">📞</span>
                              <span className="truncate">{lead.phone}</span>
                            </div>
                          )}
                          {lead.assignedAgent && (
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                              <User className="w-3 h-3 text-slate-600" />
                              <span className="truncate">Mgr: {lead.assignedAgent}</span>
                            </div>
                          )}
                        </div>

                        {/* Scheduled Meetings Badge on Card */}
                        {lead.scheduledMeetings && lead.scheduledMeetings.length > 0 && (
                          <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
                            <span className="text-[8px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                              <span>📅</span> Scheduled Call/Meeting
                            </span>
                            <div className="space-y-1">
                              {lead.scheduledMeetings.map(m => (
                                <div key={m.id} className="bg-slate-950/50 border border-slate-850 p-2 rounded-lg flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-grow">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className={`px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wide ${
                                        m.type === 'Call' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                                        m.type === 'Meeting' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' :
                                        m.type === 'Demo' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                      }`}>
                                        {m.type}
                                      </span>
                                      <p className="text-[10px] text-slate-200 font-bold truncate" title={m.title}>{m.title}</p>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                      {m.date} @ {m.time}
                                    </p>
                                  </div>
                                  {m.link && (
                                    <a
                                      href={m.link}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className="p-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 flex-shrink-0 transition-all border border-sky-500/15"
                                      title="Launch call / Join meeting room"
                                    >
                                      <Video className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Task Scheduler Status Banner inside Card */}
                        {stage.value === 'Contacted' && (
                          <div className="pt-2 border-t border-slate-800/60 space-y-2">
                            {(() => {
                              const isOverdue = lead.lastContactedAt && !lead.followUpTask?.isCompleted && (
                                (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24) > 3
                              );
                              
                              const daysCount = lead.lastContactedAt ? Math.floor(
                                (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
                              ) : 0;

                              if (isOverdue) {
                                return (
                                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-1 animate-pulse">
                                    <div className="flex items-center gap-1 text-[9px] font-black text-amber-400 uppercase tracking-wider">
                                      <span>⚠️</span>
                                      Follow-Up Overdue
                                    </div>
                                    <p className="text-[9px] text-slate-300 leading-snug">
                                      In stage for {daysCount} days (threshold: 3 days).
                                    </p>
                                    <div className="text-[8px] text-slate-500 font-mono italic">
                                      Task: {lead.followUpTask?.taskName || 'Initial campaign touchpoint'}
                                    </div>
                                  </div>
                                );
                              } else if (lead.followUpTask?.isCompleted) {
                                return (
                                  <div className="bg-emerald-950/40 border border-emerald-950/80 rounded-lg p-2.5 flex items-center justify-between text-[9px] text-emerald-400 font-semibold">
                                    <span className="flex items-center gap-1">
                                      <span>✓</span>
                                      Follow-up Resolved
                                    </span>
                                    <button 
                                      type="button"
                                      onClick={() => handleOpenReschedule(lead)}
                                      className="text-[8px] text-slate-400 hover:text-white uppercase tracking-wider font-bold"
                                    >
                                      Reschedule
                                    </button>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="bg-slate-950/50 border border-slate-850/80 rounded-lg p-2.5 space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold">
                                      <span className="flex items-center gap-1">
                                        <span>⏰</span>
                                        Follow-up Scheduled
                                      </span>
                                      <span className="text-sky-400 font-bold">{Math.max(0, 3 - daysCount)}d left</span>
                                    </div>
                                    <p className="text-[8px] text-slate-500 line-clamp-1">
                                      {lead.followUpTask?.taskName || 'Follow up on initial carrier / customer pitch'}
                                    </p>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        )}

                        {/* Interactive Board Control Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          {/* Secondary actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditLead(lead)}
                              title="Edit details"
                              className="p-1 rounded bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                            >
                              <Edit className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => onDeleteLead(lead.id)}
                              title="Delete/Archive"
                              className="p-1 rounded bg-slate-950 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-950 transition-colors"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Quick Pipeline Navigation */}
                          <div className="flex items-center gap-1">
                            {prev && (
                              <button
                                onClick={() => onUpdateStage(lead.id, prev)}
                                title={`Move back to ${prev}`}
                                className="p-1 rounded bg-slate-950 text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-slate-800 transition-colors"
                              >
                                <ChevronLeft className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {next && (
                              <button
                                onClick={() => onUpdateStage(lead.id, next)}
                                title={`Promote to ${next}`}
                                className="px-1.5 py-1 rounded bg-sky-950 hover:bg-sky-900 border border-sky-900/60 text-sky-400 hover:text-white transition-all flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider"
                              >
                                {next === 'Contacted' ? 'Pitch' : 'Next'}
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Rescheduling Modal */}
      {editingTaskLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400 animate-spin-slow" />
                Configure Follow-Up Task &amp; Schedule
              </h4>
              <button 
                onClick={() => setEditingTaskLeadId(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Follow-Up Action / Task Name
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                  placeholder="e.g. Call Relations manager or send WhatsApp nudge"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Task Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Internal Scheduler Notes
                </label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                  placeholder="e.g. Needs to confirm SIP interconnect capability first."
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTaskLeadId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTaskReschedule}
                className="px-4 py-1.5 text-xs font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
