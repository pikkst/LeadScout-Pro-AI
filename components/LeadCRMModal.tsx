import React, { useState, useEffect } from 'react';
import { CompanyLead, LeadFocus, ScheduledMeeting } from '../types';
import { 
  X, Save, Building, Mail, Globe, Phone, DollarSign, User, FileText, 
  Calendar, Clock, Video, Plus, Trash2, Edit3, ExternalLink, CalendarDays,
  Brain, Sparkles, Bell, Send, AlertTriangle, CheckCircle2, Zap
} from 'lucide-react';
import { SequenceSection } from './SequenceSection';
import { api } from '../services/apiClient';

interface LeadCRMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: CompanyLead) => void;
  lead: CompanyLead | null; // Null means adding a new lead
  focusOptions: { value: LeadFocus; label: string; icon: string }[];
}

const STAGES: { value: NonNullable<CompanyLead['stage']>; label: string; color: string }[] = [
  { value: 'Discovered', label: 'Discovered / Scouted', color: 'bg-slate-500/20 text-slate-300 border-slate-700' },
  { value: 'Contacted', label: 'Outreach / Contacted', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { value: 'Negotiation', label: 'In Negotiation', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'Signed', label: 'Bilateral Signed', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'Active', label: 'Active Traffic & Revenue', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'Archived', label: 'Archived', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
];

export const LeadCRMModal: React.FC<LeadCRMModalProps> = ({ isOpen, onClose, onSave, lead, focusOptions }) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<LeadFocus>('voip_carriers');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<NonNullable<CompanyLead['stage']>>('Discovered');
  const [phone, setPhone] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  const [assignedAgent, setAssignedAgent] = useState('Carrier Relations Team');
  const [notes, setNotes] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean; message: string; matches: any[] }>({ show: false, message: '', matches: [] });
  const [customFields, setCustomFields] = useState<Array<{ id: string; name: string; key: string; type: string; options?: string; isRequired?: boolean }>>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Monitoring & Optimization
  const [monitoringAlerts, setMonitoringAlerts] = useState<any[]>([]);
  const [sendTimeRec, setSendTimeRec] = useState<any>(null);
  const [isCheckingMonitoring, setIsCheckingMonitoring] = useState(false);
  const [isOptimizingSendTime, setIsOptimizingSendTime] = useState(false);

  // Scheduled Meetings & Calls
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);

  // Duplicate detection
  const checkDuplicate = async (website: string, email: string, name: string) => {
    if (!website && !email) {
      setDuplicateWarning({ show: false, message: '', matches: [] });
      return;
    }
    try {
      const data = await api<{ duplicate: boolean; matches: any[] }>('/leads/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({ website: website || 'https://example.com', email: email || 'test@example.com', name }),
      });
      if (data.duplicate) {
        setDuplicateWarning({
          show: true,
          message: `Potential duplicate(s) found: ${data.matches.map((m: any) => m.name).join(', ')}`,
          matches: data.matches,
        });
      } else {
        setDuplicateWarning({ show: false, message: '', matches: [] });
      }
    } catch {
      // ignore
    }
  };

  // Meeting schedule form states
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [newType, setNewType] = useState<ScheduledMeeting['type']>('Call');
  const [newAgenda, setNewAgenda] = useState('');
  const [newLink, setNewLink] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (lead) {
      setName(lead.name || '');
      setWebsite(lead.website || '');
      setEmail(lead.email || '');
      setCategory((lead.category as LeadFocus) || 'voip_carriers');
      setDescription(lead.description || '');
      setStage(lead.stage || 'Discovered');
      setPhone(lead.phone || '');
      setEstimatedValue(lead.estimatedValue || 0);
      setAssignedAgent(lead.assignedAgent || 'Carrier Relations Team');
      setNotes(lead.notes || '');
      setIsVerified(!!lead.isVerified);
      setScheduledMeetings(lead.scheduledMeetings || []);
    } else {
      setName('');
      setWebsite('');
      setEmail('');
      setCategory('voip_carriers');
      setDescription('');
      setStage('Discovered');
      setPhone('');
      setEstimatedValue(0);
      setAssignedAgent('Carrier Relations Team');
      setNotes('');
      setIsVerified(false);
      setScheduledMeetings([]);
    }
    setShowAddForm(false);
  }, [lead, isOpen]);

  // Check for duplicates when website or email changes (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (website || email) {
        checkDuplicate(website, email, name);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [website, email, name, isOpen]);

  // Load custom fields definitions
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/custom-fields', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (mounted) setCustomFields(data);
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  // Load monitoring alerts for the lead
  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    let mounted = true;
    (async () => {
      try {
        const data = await api<any[]>(`/monitoring/lead/${lead.id}`);
        if (mounted) {
          setMonitoringAlerts(data);
          setSendTimeRec(null);
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [isOpen, lead?.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: lead?.id || `lead-${Date.now()}`,
      name,
      website,
      email,
      category,
      description,
      isVerified,
      stage,
      phone,
      estimatedValue: Number(estimatedValue),
      assignedAgent,
      notes,
      scheduledMeetings,
      createdAt: lead?.createdAt || new Date().toISOString(),
      lastContactedAt: lead?.lastContactedAt,
      customFieldValues: Object.entries(customFieldValues).map(([fieldId, value]) => ({ fieldId, value })),
    });
  };

  const handleAddMeeting = () => {
    if (!newTitle.trim() || !newDate || !newTime) return;

    const meeting: ScheduledMeeting = {
      id: `meeting-${Date.now()}`,
      title: newTitle,
      date: newDate,
      time: newTime,
      duration: Number(newDuration),
      type: newType,
      agenda: newAgenda,
      link: newLink || `https://meet.jit.si/unitel-global-${name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'meeting'}-${Math.floor(Math.random() * 1000)}`
    };

    setScheduledMeetings(prev => [...prev, meeting]);

    // Reset meeting form
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setNewDuration(30);
    setNewType('Call');
    setNewAgenda('');
    setNewLink('');
    setShowAddForm(false);
  };

  const handleRemoveMeeting = (id: string) => {
    setScheduledMeetings(prev => prev.filter(m => m.id !== id));
  };

  const handleCheckMonitoring = async () => {
    if (!lead?.id) return;
    setIsCheckingMonitoring(true);
    try {
      const data = await api<any[]>(`/monitoring/lead/${lead.id}/check`, {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id }),
      });
      setMonitoringAlerts(data);
    } catch (err) {
      console.error('Failed to check monitoring:', err);
    } finally {
      setIsCheckingMonitoring(false);
    }
  };

  const handleOptimizeSendTime = async () => {
    if (!lead?.id) return;
    setIsOptimizingSendTime(true);
    try {
      const data = await api<any>(`/optimization/send-time/${lead.id}`, {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id }),
      });
      setSendTimeRec(data);
    } catch (err) {
      console.error('Failed to optimize send time:', err);
    } finally {
      setIsOptimizingSendTime(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-sky-400" />
            {lead ? 'Edit B2B Customer Profile' : 'Register New B2B Lead / Client'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Company / Carrier Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Deutsche Telekom Carrier Services"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                />
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Sales Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
              >
                {STAGES.map(stg => (
                  <option key={stg.value} value={stg.value}>
                    {stg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Website */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Corporate Website URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. carrier.telekom.de"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                />
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Carrier Relations Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. wholesale-noc@telekom.de"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Wholesale Hotline / Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +49 228 1810"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Estimated Value */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Estimated Contract Value (EUR / month)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold font-mono">€</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Focus */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Industry Segment
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LeadFocus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
              >
                {focusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Agent */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Assigned Carrier Manager
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={assignedAgent}
                  onChange={(e) => setAssignedAgent(e.target.value)}
                  placeholder="e.g. Helen Tamm (Tallinn Office)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Business Description / Sector Analysis
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief summary of their business model, focus destinations, etc."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
              />
              <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Custom Partnership Notes & Logs
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Sent pricing rates on July 19th. Looking to interconnect G.711 voice codec first. Awaiting SLA signoff."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold"
            />
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="bg-slate-950/40 border border-purple-500/20 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                Custom Fields
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      {field.name} {field.isRequired && <span className="text-rose-400">*</span>}
                    </label>
                    {field.type === 'TEXT' && (
                      <input
                        type="text"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.name}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      />
                    )}
                    {field.type === 'NUMBER' && (
                      <input
                        type="number"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      />
                    )}
                    {field.type === 'DATE' && (
                      <input
                        type="date"
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      />
                    )}
                    {field.type === 'SELECT' && field.options && (
                      <select
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      >
                        <option value="">Select...</option>
                        {field.options.split(',').map(opt => (
                          <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                        ))}
                      </select>
                    )}
                    {field.type === 'MULTISELECT' && field.options && (
                      <div className="flex flex-wrap gap-2">
                        {field.options.split(',').map(opt => {
                          const val = opt.trim();
                          const selected = customFieldValues[field.id]?.split(',').includes(val);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                const current = customFieldValues[field.id]?.split(',').filter(Boolean) || [];
                                const next = selected ? current.filter(v => v !== val) : [...current, val];
                                setCustomFieldValues(prev => ({ ...prev, [field.id]: next.join(',') }));
                              }}
                              className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-semibold transition-colors ${
                                selected
                                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {field.type === 'BOOLEAN' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`cf-${field.id}`}
                          checked={customFieldValues[field.id] === 'true'}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.checked ? 'true' : 'false' }))}
                          className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500/40"
                        />
                        <label htmlFor={`cf-${field.id}`} className="text-[10px] text-slate-400">Yes</label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call & Meeting Scheduler (Calendar Integration) */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-sky-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  📅 Call &amp; Meeting Scheduler
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg border border-sky-500/20 flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddForm ? 'Cancel' : 'Schedule Call/Meeting'}
              </button>
            </div>

            {/* List of Scheduled Meetings */}
            {scheduledMeetings.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No meetings or phone calls scheduled yet for this partner.</p>
            ) : (
              <div className="space-y-2.5">
                {scheduledMeetings.map(m => (
                  <div key={m.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          m.type === 'Call' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                          m.type === 'Meeting' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' :
                          m.type === 'Demo' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {m.type}
                        </span>
                        <h4 className="text-xs font-bold text-white">{m.title}</h4>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {m.date}
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {m.time} ({m.duration} mins)
                        </span>
                      </div>

                      {m.agenda && (
                        <p className="text-[10px] text-slate-500 italic mt-1 font-sans">{m.agenda}</p>
                      )}

                      {m.link && (
                        <a 
                          href={m.link} 
                          target="_blank" 
                          rel="noreferrer noopener" 
                          className="inline-flex items-center gap-1.5 text-[9px] text-sky-400 hover:text-sky-300 font-semibold mt-1 transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Meeting / Launch Call
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMeeting(m.id)}
                      className="self-end sm:self-center p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      title="Cancel scheduled call"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form to schedule a new call / meeting */}
            {showAddForm && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5 animate-fade-in">
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                  New Call / Meeting Event
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Event Title / Agenda Hook *
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Rate Negotiation or Route Interconnect"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Event Type
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-semibold"
                    >
                      <option value="Call">📞 Audio Call</option>
                      <option value="Meeting">👥 General Meeting</option>
                      <option value="Demo">💻 Live Screen Share / Demo</option>
                      <option value="Follow-up">🔄 Follow-up Nudge</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Duration (Minutes)
                    </label>
                    <select
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-semibold"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={90}>1.5 Hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Agenda / Private Prep Notes
                  </label>
                  <textarea
                    value={newAgenda}
                    onChange={(e) => setNewAgenda(e.target.value)}
                    rows={2}
                    placeholder="Briefly state what must be ready or negotiated during this meeting..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Google Meet / Jitsi Video Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      placeholder="e.g. https://meet.google.com/abc-def-ghi"
                      className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/50 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomRoom = Math.random().toString(36).substring(2, 10);
                        setNewLink(`https://meet.jit.si/unitel-global-${name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'partner'}-${randomRoom}`);
                      }}
                      className="text-[10px] font-bold bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/25 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Auto-Create
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMeeting}
                    disabled={!newTitle.trim() || !newDate || !newTime}
                    className="px-4 py-1.5 text-[10px] font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-55 text-white rounded-lg uppercase transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Schedule Event
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Follow-up Sequences */}
          <SequenceSection leadId={lead?.id || ''} leadStage={stage} />

          {/* Verification toggle */}
          <div className="flex items-center gap-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
            <input
              type="checkbox"
              id="isVerified"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="w-4 h-4 text-sky-500 bg-slate-900 rounded border-slate-700 focus:ring-sky-500/40 focus:ring-2"
            />
            <label htmlFor="isVerified" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
              Mark domain and wholesale email contacts as verified (SMTP checked)
            </label>
          </div>

          {/* AI Intelligence Panel */}
          {(lead?.aiScore !== undefined || lead?.enrichmentData) && (
            <div className="bg-slate-950/50 p-4 rounded-xl border border-purple-500/20 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI Intelligence
              </h3>
              
              {lead?.aiScore !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-1 rounded text-xs font-mono font-bold">
                    {lead.aiScore}% conversion probability
                  </div>
                  {lead?.aiScoreReason && (
                    <p className="text-[10px] text-slate-400 italic">{lead.aiScoreReason}</p>
                  )}
                </div>
              )}

              {lead?.enrichmentData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Company Size</span>
                    <p className="text-slate-300 mt-0.5 capitalize">{lead.enrichmentData.companySize}</p>
                  </div>
                  {lead.enrichmentData.employeeCount && (
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Employees</span>
                      <p className="text-slate-300 mt-0.5">{lead.enrichmentData.employeeCount.toLocaleString()}</p>
                    </div>
                  )}
                  {lead.enrichmentData.techStack?.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Tech Stack</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {lead.enrichmentData.techStack.map((tech: string) => (
                          <span key={tech} className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {lead.enrichmentData.recentNews?.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Recent News</span>
                      <ul className="mt-0.5 space-y-0.5">
                        {lead.enrichmentData.recentNews.map((news: string, idx: number) => (
                          <li key={idx} className="text-slate-400 italic">- {news}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lead.enrichmentData.decisionMakers?.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="font-bold text-slate-400 uppercase tracking-wider">Decision Makers</span>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {lead.enrichmentData.decisionMakers.map((dm: any, idx: number) => (
                          <span key={idx} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">
                            {dm.name} — {dm.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Monitoring Alerts */}
          {lead && (
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Competitor & Lead Monitoring
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCheckMonitoring}
                  disabled={isCheckingMonitoring}
                  className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 flex items-center gap-1 transition-all"
                >
                  {isCheckingMonitoring ? (
                    <>
                      <Brain className="w-3.5 h-3.5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Check Competitors
                    </>
                  )}
                </button>
              </div>

              {monitoringAlerts.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No monitoring alerts for this lead yet. Click "Check Competitors" to scan for new market intelligence.</p>
              ) : (
                <div className="space-y-2">
                  {monitoringAlerts.map((alert: any) => (
                    <div key={alert.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          alert.type === 'COMPETITOR' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                          'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                        }`}>
                          {alert.type}
                        </span>
                        <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{alert.description}</p>
                      {!alert.isRead && (
                        <span className="inline-block mt-2 text-[8px] font-bold text-amber-400 uppercase tracking-wider">New</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Send-Time Optimization */}
          {lead && (
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Send-Time Optimization
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleOptimizeSendTime}
                  disabled={isOptimizingSendTime}
                  className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg border border-sky-500/20 flex items-center gap-1 transition-all"
                >
                  {isOptimizingSendTime ? (
                    <>
                      <Brain className="w-3.5 h-3.5 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Optimize Send Time
                    </>
                  )}
                </button>
              </div>

              {sendTimeRec ? (
                <div className="bg-slate-900/50 border border-sky-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-1 rounded text-xs font-mono font-bold">
                      {sendTimeRec.recommendedDay} at {sendTimeRec.recommendedHour}:00
                    </div>
                    <span className="text-[10px] text-slate-400">{sendTimeRec.confidence}% confidence</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{sendTimeRec.reason}</p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 italic">No send-time recommendation yet. Click "Optimize Send Time" to get AI-powered timing suggestions.</p>
              )}
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-sky-950/20"
          >
            <Save className="w-4 h-4" />
            Save Customer Data
          </button>
              </div>
            </div>

            {duplicateWarning.show && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
                <span className="text-amber-400 text-xs">⚠️</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Potential Duplicate</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">{duplicateWarning.message}</p>
                  {duplicateWarning.matches.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {duplicateWarning.matches.map((m: any) => (
                        <div key={m.id} className="text-[9px] text-slate-400 bg-slate-900/50 rounded px-2 py-1">
                          {m.name} — {m.website} ({m.stage})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
  );
};
