import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Plus, Trash2, Users, Brain, Loader2, Bell, ChevronLeft, ChevronRight, CalendarDays, Link2 } from 'lucide-react';
import { api } from '../services/apiClient';
import { CompanyLead } from '../types';
import { useAuth } from '../context/AuthContext';

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  timezone?: string;
  agent: { id: string; name: string };
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  agenda: string;
  link?: string;
  lead: { name: string; email: string };
  agentId?: string;
  agentName?: string;
  previousStage?: string;
  nextStage?: string | null;
  timezone?: string;
}

interface MeetingPrepState {
  talkingPoints: string[];
  winThemes: string[];
  potentialObjections: string[];
  recommendedApproach: string;
}

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AvailabilityRule {
  weekday: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  timezone: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  return monday;
}

const CalendarTab: React.FC = () => {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string; role?: string }[]>([]);
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(user?.id || '');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [meetingPrep, setMeetingPrep] = useState<Record<string, MeetingPrepState>>({});
  const [prepLoading, setPrepLoading] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const [slotForm, setSlotForm] = useState({
    startDate: toDateKey(new Date()),
    startTime: '08:00',
    endTime: '17:00',
    weeks: 12,
    slotDuration: 30,
    weekdays: [1, 2, 3, 4, 5],
  });

  const [meetingForm, setMeetingForm] = useState({
    leadId: '',
    title: '',
    agenda: '',
  });

  useEffect(() => {
    loadData();
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedAgent) return;
    api<AvailabilityRule[]>(`/calendar/availability?agentId=${encodeURIComponent(selectedAgent)}`)
      .then(setAvailability)
      .catch((error) => console.error('Failed to load availability:', error));
  }, [selectedAgent]);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api<Notification[]>('/auth/notifications');
      setNotifications(data.slice(0, 20));
    } catch (error) {
      // silent
    }
  }, []);

  const loadData = async () => {
    try {
      const [slotsData, meetingsData, usersData, leadsData] = await Promise.all([
        api<Slot[]>('/calendar/slots'),
        api<Meeting[]>('/calendar/meetings'),
        api<{ id: string; name: string; role: string }[]>('/auth/users'),
        api<CompanyLead[]>('/leads'),
      ]);
      setSlots(slotsData);
      setMeetings(meetingsData);
      const visibleAgents = usersData.filter(u => u.role !== 'ADMIN' && (user?.role !== 'AGENT' || u.id === user.id));
      if (user && !visibleAgents.some(agent => agent.id === user.id)) {
        visibleAgents.unshift({ id: user.id, name: user.name, role: user.role });
      }
      setAgents(visibleAgents);
      if (!selectedAgent && user) setSelectedAgent(user.id);
      setLeads(leadsData);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    const agentId = selectedAgent || user?.id;
    if (!agentId) return;
    setSavingAvailability(true);
    try {
      const result = await api<{ rules: AvailabilityRule[]; slotsCreated: number }>('/calendar/availability', {
        method: 'POST',
        body: JSON.stringify({
          agentId,
          startDate: slotForm.startDate,
          weeks: slotForm.weeks,
          slotDuration: slotForm.slotDuration,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Tallinn',
          days: slotForm.weekdays.map(weekday => ({ weekday, startTime: slotForm.startTime, endTime: slotForm.endTime })),
        }),
      });
      setAvailability(result.rules);
      await loadData();
      setShowSlotForm(false);
      addNotification(`${result.slotsCreated} available time slots created successfully`);
    } catch (error) {
      console.error('Failed to create slots:', error);
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    const previousLead = leads.find(l => l.id === meetingForm.leadId);
    try {
      const meeting = await api<Meeting>('/calendar/book', {
        method: 'POST',
        body: JSON.stringify({
          slotId: selectedSlot.id,
          leadId: meetingForm.leadId,
          title: meetingForm.title,
          agenda: meetingForm.agenda,
        }),
      });
      await loadData();
      setShowBookingForm(false);
      setSelectedSlot(null);
      setMeetingForm({ leadId: '', title: '', agenda: '' });
      addNotification(`Meeting booked: ${meeting.title} on ${meeting.date}`);

      const leadName = meeting.lead?.name || previousLead?.name;
      if (leadName) {
        if (meeting.nextStage === 'CONTACTED') addNotification(`Lead "${leadName}" automatically moved to Contacted after booking.`);
        if (meeting.nextStage === 'NEGOTIATION') addNotification(`Lead "${leadName}" automatically moved to Negotiation after booking.`);
      }
    } catch (error) {
      console.error('Failed to book slot:', error);
    }
  };

  const handleCancelMeeting = async (id: string) => {
    if (!confirm('Cancel this meeting?')) return;
    try {
      await api(`/calendar/meetings/${id}`, { method: 'DELETE' });
      await loadData();
      addNotification('Meeting cancelled');
    } catch (error) {
      console.error('Failed to cancel meeting:', error);
    }
  };

  const handleGeneratePrep = async (meetingId: string) => {
    setPrepLoading(meetingId);
    try {
      const prep = await api<MeetingPrepState>(`/ai/meeting-prep/${meetingId}`, { method: 'POST' });
      setMeetingPrep(prev => ({ ...prev, [meetingId]: prep }));
    } catch (error) {
      console.error('Failed to generate meeting prep:', error);
    } finally {
      setPrepLoading(null);
    }
  };

  const addNotification = (message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications(prev => [notification, ...prev].slice(0, 20));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CALL: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      MEETING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      DEMO: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      FOLLOW_UP: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    };
    return colors[type] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  };

  const weekDates = Array.from({ length: 7 }, (_, index) => toDateKey(addCalendarDays(weekStart, index)));
  const weekEnd = weekDates[6];
  const filteredSlots = slots.filter(slot => {
    if (selectedAgent && slot.agent?.id !== selectedAgent) return false;
    return slot.date >= weekDates[0] && slot.date <= weekEnd;
  });
  const filteredMeetings = meetings.filter(meeting => {
    if (selectedAgent && meeting.agentId !== selectedAgent) return false;
    return meeting.date >= weekDates[0] && meeting.date <= weekEnd;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleNotifications = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      try {
        await api('/auth/notifications/read-all', { method: 'PATCH' });
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        void loadNotifications();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            Calendar & Scheduling
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Set recurring work hours, share booking links and manage confirmed meetings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="p-2 text-slate-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-white">Notifications</h4>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500">No notifications</div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {notifications.map(n => (
                      <div key={n.id} className="p-3 hover:bg-slate-850">
                        <div className="text-xs text-slate-300">{n.message}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{n.timestamp}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}{agent.id === user?.id ? ' (me)' : ''}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSlotForm(true)}
            className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Clock className="w-3 h-3" />
            Set Work Hours
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-4 h-4 text-sky-400 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-slate-200">Weekly availability</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {availability.length > 0
                ? availability.map(rule => `${DAY_NAMES[rule.weekday - 1].slice(0, 3)} ${rule.startTime}–${rule.endTime}`).join(' · ')
                : 'No recurring work hours configured for this user.'}
            </div>
          </div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <Link2 className="w-4 h-4 text-emerald-400 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-slate-200">Booking links are automatic</div>
            <div className="text-[11px] text-slate-500 mt-1">Every sent outreach email includes a secure booking link. Confirmations include an ICS invite for Google, Outlook and local calendars.</div>
          </div>
        </div>
      </div>

      {/* Week calendar */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            {formatDate(weekDates[0])} – {formatDate(weekEnd)}
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="text-[10px] font-bold px-3 py-2 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-900">Today</button>
            <button type="button" aria-label="Previous week" onClick={() => setWeekStart(current => addCalendarDays(current, -7))} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" aria-label="Next week" onClick={() => setWeekStart(current => addCalendarDays(current, 7))} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {weekDates.map((date, dayIndex) => {
            const daySlots = filteredSlots.filter(slot => slot.date === date);
            const dayMeetings = filteredMeetings.filter(meeting => meeting.date === date);
            const isToday = date === toDateKey(new Date());
            return (
              <div key={date} className={`min-h-44 rounded-xl border p-2 ${isToday ? 'border-sky-500/50 bg-sky-500/5' : 'border-slate-800 bg-slate-900/30'}`}>
                <div className="px-1 pb-2 mb-2 border-b border-slate-800">
                  <div className={`text-[10px] font-bold uppercase ${isToday ? 'text-sky-400' : 'text-slate-500'}`}>{DAY_NAMES[dayIndex]}</div>
                  <div className="text-sm font-bold text-slate-200">{new Date(`${date}T12:00:00`).getDate()}</div>
                </div>
                <div className="space-y-1.5">
                  {dayMeetings.map(meeting => (
                    <div key={meeting.id} className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1.5">
                      <div className="text-[10px] font-bold text-purple-300">{meeting.time} · Booked</div>
                      <div className="text-[9px] text-slate-400 truncate">{meeting.lead.name}</div>
                    </div>
                  ))}
                  {daySlots.slice(0, 12).map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => { setSelectedSlot(slot); setShowBookingForm(true); }}
                      className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 px-2 py-1.5 text-left transition-colors"
                    >
                      <div className="text-[10px] font-bold text-emerald-400">{slot.startTime}–{slot.endTime}</div>
                      <div className="text-[9px] text-slate-600">Available</div>
                    </button>
                  ))}
                  {daySlots.length > 12 && <div className="text-[9px] text-center text-slate-600">+{daySlots.length - 12} more</div>}
                  {daySlots.length === 0 && dayMeetings.length === 0 && <div className="text-[10px] text-slate-700 px-1 py-2">No availability</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upcoming Meetings */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          Upcoming Meetings
        </h3>
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-slate-900/50 border border-slate-850 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${getTypeColor(meeting.type)}`}>
                      {meeting.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-white">{meeting.title}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDate(meeting.date)} at {meeting.time} • {meeting.duration} min • {meeting.timezone || 'Europe/Tallinn'}
                  </div>
                  <div className="text-xs text-slate-500">
                    With: {meeting.lead.name} ({meeting.lead.email})
                  </div>
                  {meeting.agentName && (
                    <div className="text-xs text-slate-500">
                      Agent: {meeting.agentName}
                    </div>
                  )}
                  {meeting.agenda && (
                    <div className="text-xs text-slate-500 mt-1">{meeting.agenda}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleGeneratePrep(meeting.id)}
                    disabled={prepLoading === meeting.id}
                    className="p-2 hover:bg-purple-900/30 rounded-lg transition-colors"
                    title="Generate AI meeting prep"
                  >
                    {prepLoading === meeting.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Brain className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                  <button
                    onClick={() => handleCancelMeeting(meeting.id)}
                    className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Cancel meeting"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              {/* AI Meeting Prep */}
              {meetingPrep[meeting.id] && (
                <div className="mt-4 bg-slate-950/60 border border-purple-500/20 rounded-xl p-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5" />
                    AI Meeting Prep
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Talking Points</div>
                      <ul className="space-y-1">
                        {meetingPrep[meeting.id].talkingPoints.map((point, idx) => (
                          <li key={idx} className="text-[10px] text-slate-300 flex items-start gap-1">
                            <span className="text-purple-400 mt-0.5">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Win Themes</div>
                      <ul className="space-y-1">
                        {meetingPrep[meeting.id].winThemes.map((theme, idx) => (
                          <li key={idx} className="text-[10px] text-emerald-300 flex items-start gap-1">
                            <span className="text-emerald-400 mt-0.5">★</span>
                            {theme}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Objections to Address</div>
                      <ul className="space-y-1">
                        {meetingPrep[meeting.id].potentialObjections.map((obj, idx) => (
                          <li key={idx} className="text-[10px] text-amber-300 flex items-start gap-1">
                            <span className="text-amber-400 mt-0.5">!</span>
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recommended Approach</div>
                    <p className="text-[10px] text-slate-300">{meetingPrep[meeting.id].recommendedApproach}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {meetings.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs">
              No meetings scheduled yet.
            </div>
          )}
        </div>
      </section>

      {/* Recurring availability modal */}
      {showSlotForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-sm font-bold text-white mb-1">Set Weekly Work Hours</h3>
            <p className="text-xs text-slate-500 mb-5">Create bookable slots for {agents.find(agent => agent.id === selectedAgent)?.name || 'this user'}.</p>
            <form onSubmit={handleCreateSlots} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Working days
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((day, index) => {
                    const weekday = index + 1;
                    const enabled = slotForm.weekdays.includes(weekday);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSlotForm(current => ({
                          ...current,
                          weekdays: enabled ? current.weekdays.filter(value => value !== weekday) : [...current.weekdays, weekday].sort(),
                        }))}
                        className={`rounded-lg py-2 text-[10px] font-bold ${enabled ? 'bg-sky-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-500'}`}
                      >
                        {day.slice(0, 2)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Generate from
                </label>
                <input
                  type="date"
                  value={slotForm.startDate}
                  min={toDateKey(new Date())}
                  onChange={(e) => setSlotForm({ ...slotForm, startDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Weeks ahead</label>
                  <select value={slotForm.weeks} onChange={(e) => setSlotForm({ ...slotForm, weeks: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs">
                    <option value={4}>4 weeks</option>
                    <option value={8}>8 weeks</option>
                    <option value={12}>12 weeks</option>
                    <option value={26}>26 weeks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Slot length</label>
                  <select value={slotForm.slotDuration} onChange={(e) => setSlotForm({ ...slotForm, slotDuration: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs">
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingAvailability || slotForm.weekdays.length === 0}
                  className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {savingAvailability && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save & Generate Slots
                </button>
                <button
                  type="button"
                  onClick={() => setShowSlotForm(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Slot Modal */}
      {showBookingForm && selectedSlot && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-sm font-bold text-white mb-4">Book Meeting</h3>
            <div className="text-xs text-slate-400 mb-4">
              {selectedSlot.date} at {selectedSlot.startTime} - {selectedSlot.endTime}
              <br />
              with {selectedSlot.agent?.name}
            </div>
            <form onSubmit={handleBookSlot} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Select Lead
                </label>
                <select
                  value={meetingForm.leadId}
                  onChange={(e) => setMeetingForm({ ...meetingForm, leadId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                >
                  <option value="">Select lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Agenda
                </label>
                <textarea
                  value={meetingForm.agenda}
                  onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  Confirm Booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingForm(false);
                    setSelectedSlot(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTab;
