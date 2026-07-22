import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailX, ShieldCheck } from 'lucide-react';

const PublicUnsubscribePage: React.FC<{ token: string }> = ({ token }) => {
  const [details, setDetails] = useState<{ emailMasked: string; suppressed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/public/unsubscribe/${encodeURIComponent(token)}`).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'This unsubscribe link is invalid.');
      setDetails(body);
    }).catch((err) => setError(err.message));
  }, [token]);
  const unsubscribe = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/public/unsubscribe/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Your request could not be completed.');
      setDetails({ emailMasked: body.emailMasked, suppressed: true });
    } catch (err) { setError(err instanceof Error ? err.message : 'Your request could not be completed.'); }
    finally { setBusy(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100"><section aria-labelledby="unsubscribe-title" className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"><MailX className="mb-4 h-9 w-9 text-sky-400" /><h1 id="unsubscribe-title" className="text-2xl font-black">Email preferences</h1>{!details && !error && <p className="mt-4 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Checking your secure link…</p>}{details && (details.suppressed ? <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"><p className="flex items-center gap-2 font-bold text-emerald-300"><CheckCircle2 className="h-5 w-5" />You are unsubscribed</p><p className="mt-2 text-sm text-slate-400">We will not send further outreach to {details.emailMasked}.</p></div> : <><p className="mt-4 text-sm leading-relaxed text-slate-400">Stop future outreach to <strong className="text-slate-200">{details.emailMasked}</strong>. This takes effect immediately.</p><button type="button" onClick={unsubscribe} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Unsubscribe</button></>)}{error && <p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</p>}<p className="mt-6 flex items-center gap-2 text-[11px] text-slate-600"><ShieldCheck className="h-4 w-4" />No login or personal data is required.</p></section></main>;
};
export default PublicUnsubscribePage;
