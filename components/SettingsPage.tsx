import React, { useEffect, useState, useCallback } from 'react';
import {
  Cpu,
  Mail,
  ShieldCheck,
  Server,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Send,
  Building2,
  Upload,
  Trash2,
} from 'lucide-react';
import {
  fetchSettings,
  saveSettings,
  testAiConnection,
  testEmailConnection,
  uploadLogo,
  removeLogo,
  SettingsResponse,
  SMTP_PRESETS,
  GEMINI_MODELS,
  TestResult,
} from '../services/settingsService';
import { ApiError } from '../services/apiClient';

type Values = Record<string, string | boolean>;

const bool = (v: string | boolean | undefined) => v === true || v === 'true';

export const SettingsPage: React.FC = () => {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [values, setValues] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Test states
  const [aiTest, setAiTest] = useState<{ busy: boolean; result?: TestResult }>({ busy: false });
  const [emailTest, setEmailTest] = useState<{ busy: boolean; result?: TestResult }>({ busy: false });

  // Logo upload state
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSettings();
      setData(res);
      setValues({ ...res.values });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const isSecretSet = (key: string) => Boolean(values[`${key}__set`]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Only send editable keys (skip the __set helper flags).
      const payload: Record<string, string | boolean> = {};
      for (const k of Object.keys(values)) {
        if (k.endsWith('__set')) continue;
        payload[k] = values[k];
      }
      const res = await saveSettings(payload);
      setValues({ ...res.values });
      // Clear typed secret fields after save (they are now stored).
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAi = async () => {
    setAiTest({ busy: true });
    try {
      const typedKey = String(values.GEMINI_API_KEY || '');
      const result = await testAiConnection(
        typedKey ? { apiKey: typedKey, model: String(values.GEMINI_MODEL || '') } : undefined,
      );
      setAiTest({ busy: false, result });
    } catch (err) {
      setAiTest({ busy: false, result: { ok: false, message: err instanceof ApiError ? err.message : 'Test failed' } });
    }
  };

  const handleTestEmail = async () => {
    setEmailTest({ busy: true });
    try {
      const result = await testEmailConnection({
        host: String(values.SMTP_HOST || ''),
        port: Number(values.SMTP_PORT || 587),
        secure: bool(values.SMTP_SECURE),
        user: String(values.SMTP_USER || ''),
        pass: String(values.SMTP_PASS || ''),
      });
      setEmailTest({ busy: false, result });
    } catch (err) {
      setEmailTest({ busy: false, result: { ok: false, message: err instanceof ApiError ? err.message : 'Test failed' } });
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = SMTP_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'custom') return;
    setValues((prev) => ({
      ...prev,
      SMTP_HOST: preset.host,
      SMTP_PORT: String(preset.port),
      SMTP_SECURE: preset.secure,
    }));
    setSaved(false);
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setLogoBusy(true);
    setLogoError(null);
    try {
      const res = await uploadLogo(file);
      set('COMPANY_LOGO_URL', res.logoUrl);
    } catch (err) {
      setLogoError(err instanceof ApiError ? err.message : 'Logo upload failed');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoBusy(true);
    setLogoError(null);
    try {
      await removeLogo();
      set('COMPANY_LOGO_URL', '');
    } catch (err) {
      setLogoError(err instanceof ApiError ? err.message : 'Logo removal failed');
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest">Loading settings…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
        {error || 'Could not load settings.'}
      </div>
    );
  }

  const inputClass =
    'w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40';
  const labelClass = 'block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2';

  const currentPreset =
    SMTP_PRESETS.find(
      (p) => p.id !== 'custom' && p.host === values.SMTP_HOST && String(p.port) === String(values.SMTP_PORT),
    )?.id || 'custom';
  const presetNote = SMTP_PRESETS.find((p) => p.id === currentPreset)?.note;

  const renderTestResult = (result?: TestResult) =>
    result ? (
      <div
        className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 mt-2 ${
          result.ok
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}
      >
        {result.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
        <span className="break-words">{result.message}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Save bar */}
      <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4 sticky top-2 z-10 backdrop-blur">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            Workspace Settings
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Configure AI, email and security. Changes apply instantly — no server restart or file edits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* AI SECTION */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            AI Engine (Google Gemini)
          </h3>
          <StatusPill on={Boolean(isSecretSet('GEMINI_API_KEY'))} labelOn="Configured" labelOff="Not set" />
        </div>

        <div>
          <label className={labelClass}>API Key</label>
          <SecretInput
            value={String(values.GEMINI_API_KEY || '')}
            isSet={isSecretSet('GEMINI_API_KEY')}
            show={showSecrets.GEMINI_API_KEY}
            onToggle={() => setShowSecrets((s) => ({ ...s, GEMINI_API_KEY: !s.GEMINI_API_KEY }))}
            onChange={(v) => set('GEMINI_API_KEY', v)}
            placeholder="AIza..."
          />
          <p className="text-[10px] text-slate-500 mt-1.5">
            Get a key at{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
              aistudio.google.com/app/apikey
            </a>
            .
          </p>
        </div>

        <div>
          <label className={labelClass}>Model</label>
          <select className={inputClass} value={String(values.GEMINI_MODEL || '')} onChange={(e) => set('GEMINI_MODEL', e.target.value)}>
            {GEMINI_MODELS.map((m) => (
              <option key={m.value} value={m.value} className="bg-slate-950">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            onClick={handleTestAi}
            disabled={aiTest.busy}
            className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 font-bold px-4 py-2 rounded-lg uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            {aiTest.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Test AI Connection
          </button>
          {renderTestResult(aiTest.result)}
        </div>
      </section>

      {/* EMAIL SECTION */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400" />
            Email Sending (SMTP)
          </h3>
          <StatusPill
            on={Boolean(values.SMTP_HOST && values.SMTP_USER && isSecretSet('SMTP_PASS'))}
            labelOn="Configured"
            labelOff="Not set"
          />
        </div>

        <div>
          <label className={labelClass}>Email Provider</label>
          <select className={inputClass} value={currentPreset} onChange={(e) => applyPreset(e.target.value)}>
            {SMTP_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-950">
                {p.label}
              </option>
            ))}
          </select>
          {presetNote && <p className="text-[10px] text-amber-400/80 mt-1.5">{presetNote}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>SMTP Host</label>
            <input className={inputClass} value={String(values.SMTP_HOST || '')} onChange={(e) => set('SMTP_HOST', e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className={labelClass}>Port</label>
            <input className={inputClass} value={String(values.SMTP_PORT || '')} onChange={(e) => set('SMTP_PORT', e.target.value)} placeholder="587" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" checked={bool(values.SMTP_SECURE)} onChange={(e) => set('SMTP_SECURE', e.target.checked)} className="w-4 h-4 accent-sky-500" />
          Use TLS/SSL (enable for port 465)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Username</label>
            <input className={inputClass} value={String(values.SMTP_USER || '')} onChange={(e) => set('SMTP_USER', e.target.value)} placeholder="you@unitelglobal.com" />
          </div>
          <div>
            <label className={labelClass}>Password / App Password</label>
            <SecretInput
              value={String(values.SMTP_PASS || '')}
              isSet={isSecretSet('SMTP_PASS')}
              show={showSecrets.SMTP_PASS}
              onToggle={() => setShowSecrets((s) => ({ ...s, SMTP_PASS: !s.SMTP_PASS }))}
              onChange={(v) => set('SMTP_PASS', v)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sender Name</label>
            <input className={inputClass} value={String(values.SMTP_FROM_NAME || '')} onChange={(e) => set('SMTP_FROM_NAME', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Sender Email</label>
            <input className={inputClass} value={String(values.SMTP_FROM_EMAIL || '')} onChange={(e) => set('SMTP_FROM_EMAIL', e.target.value)} placeholder="info@unitelglobal.com" />
          </div>
        </div>

        <div>
          <button
            onClick={handleTestEmail}
            disabled={emailTest.busy}
            className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-400 font-bold px-4 py-2 rounded-lg uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            {emailTest.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Test Email Connection
          </button>
          {renderTestResult(emailTest.result)}
        </div>
      </section>

      {/* COMPANY PROFILE SECTION */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Company Profile
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            This is your organization's identity. The AI agents use it to personalize every scouted pitch
            and email — fill it once and the outreach writes itself in your brand voice.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Company Name</label>
            <input className={inputClass} value={String(values.COMPANY_NAME || '')} onChange={(e) => set('COMPANY_NAME', e.target.value)} placeholder="Acme Communications Ltd." />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input className={inputClass} value={String(values.COMPANY_WEBSITE || '')} onChange={(e) => set('COMPANY_WEBSITE', e.target.value)} placeholder="https://acme.com" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Logo (upload or URL)</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {values.COMPANY_LOGO_URL ? (
                  <img src={String(values.COMPANY_LOGO_URL)} alt="logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-600" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={logoBusy}
                    className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 font-bold px-3 py-2 rounded-lg uppercase tracking-wider flex items-center gap-2 transition-colors"
                  >
                    {logoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {values.COMPANY_LOGO_URL ? 'Change' : 'Upload'}
                  </button>
                  {values.COMPANY_LOGO_URL && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={logoBusy}
                      className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 font-bold px-3 py-2 rounded-lg uppercase tracking-wider flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                <span className="text-[10px] text-slate-500">PNG/JPG/WEBP/SVG, max 2 MB.</span>
              </div>
            </div>
            {logoError && <p className="text-[10px] text-rose-400 mt-1.5">{logoError}</p>}
            <p className="text-[10px] text-slate-500 mt-1.5">Used in outreach emails. Leave blank to use a text header (no broken images).</p>
          </div>
          <div>
            <label className={labelClass}>Logo URL (optional, overrides upload)</label>
            <input className={inputClass} value={String(values.COMPANY_LOGO_URL || '')} onChange={(e) => set('COMPANY_LOGO_URL', e.target.value)} placeholder="https://acme.com/logo.png" />
          </div>
        </div>

        <div>
          <label className={labelClass}>What your company does</label>
          <textarea className={inputClass + ' min-h-[64px]'} value={String(values.COMPANY_DESCRIPTION || '')} onChange={(e) => set('COMPANY_DESCRIPTION', e.target.value)} placeholder="Brief description of your business, market and positioning." />
        </div>

        <div>
          <label className={labelClass}>Products / Services you sell</label>
          <textarea className={inputClass + ' min-h-[64px]'} value={String(values.COMPANY_OFFERINGS || '')} onChange={(e) => set('COMPANY_OFFERINGS', e.target.value)} placeholder="Wholesale voice termination, SMS API, CPaaS, IoT connectivity..." />
        </div>

        <div>
          <label className={labelClass}>Value proposition / differentiators</label>
          <textarea className={inputClass + ' min-h-[64px]'} value={String(values.COMPANY_VALUE_PROP || '')} onChange={(e) => set('COMPANY_VALUE_PROP', e.target.value)} placeholder="Why customers choose you: rates, quality, coverage, support..." />
        </div>

        <div>
          <label className={labelClass}>Preferred outreach language</label>
          <input className={inputClass} value={String(values.COMPANY_LANGUAGE || '')} onChange={(e) => set('COMPANY_LANGUAGE', e.target.value)} placeholder="English" />
        </div>
      </section>

      {/* SECURITY SECTION */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Security & Access
        </h3>
        <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={bool(values.ALLOW_PUBLIC_REGISTRATION)}
            onChange={(e) => set('ALLOW_PUBLIC_REGISTRATION', e.target.checked)}
            className="w-4 h-4 accent-sky-500 mt-0.5"
          />
          <span>
            <span className="font-bold text-slate-200">Allow public self-registration</span>
            <br />
            <span className="text-slate-500">When off, only admins can create new team accounts (recommended).</span>
          </span>
        </label>
      </section>

      {/* SYSTEM (read-only) */}
      <section className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-400" />
          System (managed in .env)
        </h3>
        <p className="text-[11px] text-slate-500">
          These are set at deployment and cannot be changed here for safety.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <ReadonlyRow label="Environment" value={data.bootstrap.nodeEnv} />
          <ReadonlyRow label="Port" value={String(data.bootstrap.port)} />
          <ReadonlyRow label="Database" value={data.bootstrap.databaseConfigured ? 'Connected' : 'Not configured'} ok={data.bootstrap.databaseConfigured} />
          <ReadonlyRow label="JWT Secret" value={data.bootstrap.jwtConfigured ? 'Set' : 'Weak/Missing'} ok={data.bootstrap.jwtConfigured} />
        </div>
      </section>
    </div>
  );
};

const StatusPill: React.FC<{ on: boolean; labelOn: string; labelOff: string }> = ({ on, labelOn, labelOff }) => (
  <span
    className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
      on ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/50 text-slate-500 border-slate-700'
    }`}
  >
    {on ? labelOn : labelOff}
  </span>
);

const ReadonlyRow: React.FC<{ label: string; value: string; ok?: boolean }> = ({ label, value, ok }) => (
  <div className="bg-slate-900/50 border border-slate-850 rounded-lg px-3 py-2">
    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`font-mono text-xs mt-0.5 ${ok === false ? 'text-amber-400' : 'text-slate-300'}`}>{value}</div>
  </div>
);

const SecretInput: React.FC<{
  value: string;
  isSet: boolean;
  show?: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, isSet, show, onToggle, onChange, placeholder }) => (
  <div className="relative">
    <input
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={isSet && !value ? '•••••••• (saved — leave blank to keep)' : placeholder}
      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pr-10 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
      tabIndex={-1}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);
