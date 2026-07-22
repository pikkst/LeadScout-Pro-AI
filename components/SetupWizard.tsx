import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2, Rocket, X } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { ActivationState, AppTab, OnboardingTemplate, applyOnboardingTemplate, fetchActivationState, fetchOnboardingTemplates, setWizardDismissed } from '../services/activationService';

export const SetupWizard: React.FC<{ isAdmin: boolean; activeTab: AppTab; refreshKey: string; onNavigate: (tab: AppTab) => void }> = ({ isAdmin, activeTab, refreshKey, onNavigate }) => {
  const [state, setState] = useState<ActivationState | null>(null);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetchActivationState(), fetchOnboardingTemplates()])
      .then(([nextState, nextTemplates]) => { setState(nextState); setTemplates(nextTemplates); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Setup progress could not be loaded.'));
  }, [isAdmin, activeTab, refreshKey]);

  if (!isAdmin || !state || state.complete || state.dismissed) return null;
  const next = state.steps.find((step) => !step.complete && step.id !== 'booking');

  const selectTemplate = async (templateId: string) => {
    setBusy(true); setError(null);
    try { setState((await applyOnboardingTemplate(templateId)).state); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'The playbook could not be applied.'); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="setup-wizard-title" className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 id="setup-wizard-title" className="flex items-center gap-2 text-sm font-bold text-white"><Rocket className="h-4 w-4 text-sky-400" />Launch checklist</h2>
          <p className="mt-1 text-xs text-slate-400">Reach a verified, compliant first send and publish your booking page in under 15 minutes.</p>
        </div>
        <button type="button" aria-label="Hide setup wizard" onClick={() => setWizardDismissed(true).then(() => setState({ ...state, dismissed: true }))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900" role="progressbar" aria-label="Setup progress" aria-valuenow={state.progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-sky-500 transition-all" style={{ width: `${state.progress}%` }} /></div>
      <p className="mt-1 text-right text-[10px] font-bold text-sky-400">{state.progress}% complete</p>
      {!state.templateId && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {templates.map((template) => <button key={template.id} type="button" disabled={busy} onClick={() => selectTemplate(template.id)} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-left hover:border-sky-500/50 disabled:opacity-50"><span className="block text-xs font-bold text-white">{template.name}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{template.description}</span></button>)}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {state.steps.slice(0, 7).map((step) => <span key={step.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${step.complete ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 text-slate-400'}`}>{step.complete && <CheckCircle2 className="h-3 w-3" />}{step.label}</span>)}
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-rose-400">{error}</p>}
      {next && next.action !== 'template' && <button type="button" onClick={() => onNavigate(next.action)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500">Continue: {next.label}{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}</button>}
    </section>
  );
};
