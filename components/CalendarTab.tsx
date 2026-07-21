import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Users, CheckCircle, XCircle, Brain, Loader2 } from 'lucide-react';

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
  agent: { name: string };
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
}

interface MeetingPrepState {
  talkingPoints: string[];
  winThemes: string[];
  potentialObjections: string[];
  recommendedApproach: string;
}

const CalendarTab: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [meetingPrep, setMeetingPrep] = useState<Record<string, MeetingPrepState>>({});
  const [prepLoading, setPrepLoading] = useState<string | null>(null);

  const [slotForm, setSlotForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    agentId: '',
  });

  const [meetingForm, setMeetingForm] = useState({
    leadId: '',
    title: '',
    agenda: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [slotsRes, meetingsRes, usersRes] = await Promise.all([
        fetch('/api/calendar/slots'),
        fetch('/api/calendar/meetings'),
        fetch('/api/auth/users'),
      ]);
      const [slotsData, meetingsData, usersData] = await Promise.all([
        slotsRes.json(),
        meetingsRes.json(),
        usersRes.json(),
      ]);
      setSlots(slotsData);
      setMeetings(meetingsData);
      setAgents(usersData.filter((u: { role: string }) => u.role !== 'ADMIN'));
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/calendar/slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...slotForm,
          interval: 30,
        }),
      });
      await loadData();
      setShowSlotForm(false);
      setSlotForm({ date: '', startTime: '09:00', endTime: '17:00', agentId: '' });
    } catch (error) {
      console.error('Failed to create slots:', error);
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    try {
      await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          ...meetingForm,
        }),
      });
      await loadData();
      setShowBookingForm(false);
      setSelectedSlot(null);
      setMeetingForm({ leadId: '', title: '', agenda: '' });
    } catch (error) {
      console.error('Failed to book slot:', error);
    }
  };

  const handleCancelMeeting = async (id: string) => {
    if (!confirm('Cancel this meeting?')) return;
    try {
      await fetch(`/api/calendar/meetings/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Failed to cancel meeting:', error);
    }
  };

  const handleGeneratePrep = async (meetingId: string) => {
    setPrepLoading(meetingId);
    try {
      const res = await fetch(`/api/ai/meeting-prep/${meetingId}`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const prep = await res.json();
        setMeetingPrep(prev => ({ ...prev, [meetingId]: prep }));
      }
    } catch (error) {
      console.error('Failed to generate meeting prep:', error);
    } finally {
      setPrepLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('et-EE', {
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

  const filteredSlots = slots.filter(slot => {
    if (selectedAgent && slot.agent.name !== selectedAgent) return false;
    if (selectedDate && slot.date !== selectedDate) return false;
    return true;
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            Calendar & Scheduling
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Book meetings and manage availability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.name}>{agent.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
          <button
            onClick={() => setShowSlotForm(true)}
            className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Slots
          </button>
        </div>
      </div>

      {/* Available Slots */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Available Time Slots
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredSlots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => {
                setSelectedSlot(slot);
                setShowBookingForm(true);
              }}
              disabled={!slot.isAvailable || slot.isBooked}
              className={`p-3 rounded-lg text-xs font-medium transition-colors ${
                slot.isBooked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed line-through'
                  : slot.isAvailable
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <div className="font-bold">{slot.startTime}</div>
              <div className="text-[10px] opacity-70">{slot.agent.name}</div>
            </button>
          ))}
          {filteredSlots.length === 0 && (
            <div className="col-span-full text-center py-6 text-slate-500 text-xs">
              No available slots. Add slots for agents to see them here.
            </div>
          )}
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
                    {formatDate(meeting.date)} at {meeting.time} • {meeting.duration} min
                  </div>
                  <div className="text-xs text-slate-500">
                    With: {meeting.lead.name} ({meeting.lead.email})
                  </div>
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

      {/* Add Slots Modal */}
      {showSlotForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-sm font-bold text-white mb-4">Add Time Slots</h3>
            <form onSubmit={handleCreateSlots} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Agent
                </label>
                <select
                  value={slotForm.agentId}
                  onChange={(e) => setSlotForm({ ...slotForm, agentId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                >
                  <option value="">Select agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={slotForm.date}
                  onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  required
                />
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
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  Create Slots
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
              with {selectedSlot.agent.name}
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
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
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
