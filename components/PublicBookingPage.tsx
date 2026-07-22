import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Globe2, Loader2, ShieldCheck } from 'lucide-react';

interface PublicSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface BookingData {
  booked?: boolean;
  host: { name: string };
  attendee: { name: string; emailMasked: string };
  meetingTitle: string;
  expiresAt: string;
  timezone: string;
  slots: PublicSlot[];
  meeting?: BookingResult['meeting'];
}

interface BookingResult {
  meeting: {
    title: string;
    date: string;
    time: string;
    endTime: string;
    duration: number;
    hostName: string;
    timezone: string;
  };
}

function formatDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(new Date(`${date}T12:00:00`));
}

const PublicBookingPage: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<BookingData | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [agenda, setAgenda] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    fetch(`/api/public/booking/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load booking calendar.');
        return payload as BookingData;
      })
      .then((payload) => {
        if (payload.booked && payload.meeting) {
          setResult({ meeting: payload.meeting });
        }
        setData(payload);
        setSelectedDate(payload.slots[0]?.date || '');
      })
      .catch((requestError) => setError((requestError as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  const availableDates = useMemo(
    () => Array.from(new Set(data?.slots.map((slot) => slot.date) || [])).slice(0, 21),
    [data],
  );
  const daySlots = data?.slots.filter((slot) => slot.date === selectedDate) || [];

  const confirmBooking = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/public/booking/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: selectedSlot.id, agenda }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to book this time.');
      setResult(payload as BookingResult);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <CalendarDays className="w-10 h-10 text-slate-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Booking link unavailable</h1>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </main>
    );
  }

  if (result) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-5" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400 mb-2">Meeting confirmed</p>
          <h1 className="text-2xl font-bold mb-3">{result.meeting.title}</h1>
          <p className="text-slate-300 mb-1">{formatDate(result.meeting.date, { weekday: 'long' })}</p>
          <p className="text-lg font-semibold text-white mb-5">{result.meeting.time}–{result.meeting.endTime}</p>
          <p className="text-xs text-slate-500 -mt-3 mb-5">{result.meeting.timezone}</p>
          <p className="text-sm text-slate-400">A calendar invitation has been emailed to you and {result.meeting.hostName}.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">
        <header className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <Globe2 className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="font-bold">LeadScout PRO AI</div>
            <div className="text-xs text-slate-500">Secure meeting scheduling</div>
          </div>
        </header>

        <div className="grid lg:grid-cols-[320px_1fr] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <aside className="p-7 md:p-9 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/80">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400 mb-4">Meeting invitation</div>
            <h1 className="text-2xl font-bold leading-tight mb-6">Choose a time with {data?.host.name}</h1>
            <div className="space-y-4 text-sm text-slate-400">
              <div className="flex gap-3"><Clock className="w-4 h-4 text-slate-500 mt-0.5" /><span>30–60 minute available slots</span></div>
              <div className="text-xs text-slate-500 pl-7">Times shown in {data?.timezone}</div>
              <div className="flex gap-3"><CalendarDays className="w-4 h-4 text-slate-500 mt-0.5" /><span>Calendar invitation included</span></div>
              <div className="flex gap-3"><ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5" /><span>Invitation for {data?.attendee.emailMasked}</span></div>
            </div>
          </aside>

          <section className="p-6 md:p-9">
            {availableDates.length === 0 ? (
              <div className="min-h-80 flex flex-col items-center justify-center text-center">
                <CalendarDays className="w-10 h-10 text-slate-600 mb-3" />
                <h2 className="font-bold mb-2">No available times yet</h2>
                <p className="text-sm text-slate-500 max-w-sm">Please reply to the email and ask {data?.host.name} to add more availability.</p>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-bold mb-3">Select a date</h2>
                <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
                  {availableDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                      className={`min-w-24 rounded-xl border px-3 py-3 text-left transition-colors ${selectedDate === date ? 'border-sky-400 bg-sky-500/15 text-white' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'}`}
                    >
                      <div className="text-[10px] uppercase font-bold">{formatDate(date).split(',')[0]}</div>
                      <div className="text-xs mt-1">{formatDate(date).split(',').slice(1).join(',')}</div>
                    </button>
                  ))}
                </div>

                <h2 className="text-sm font-bold mb-3">Select a time</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-7">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      data-testid={`booking-slot-${slot.id}`}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${selectedSlot?.id === slot.id ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-emerald-500/50'}`}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>

                {selectedSlot && (
                  <div className="border-t border-slate-800 pt-6">
                    <label className="block text-xs font-bold text-slate-300 mb-2" htmlFor="agenda">Anything we should prepare? <span className="text-slate-600">(optional)</span></label>
                    <textarea
                      id="agenda"
                      value={agenda}
                      onChange={(event) => setAgenda(event.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      placeholder="Topics, questions or context for the meeting"
                    />
                    {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
                    <button
                      data-testid="confirm-booking"
                      type="button"
                      onClick={confirmBooking}
                      disabled={submitting}
                      className="mt-4 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Confirm {selectedSlot.startTime}–{selectedSlot.endTime}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default PublicBookingPage;
