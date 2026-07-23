// Settings service (frontend): admin-only configuration API.
import { api } from './apiClient';

export type SettingType = 'string' | 'number' | 'boolean' | 'secret';
export type SettingGroup = 'ai' | 'email' | 'security' | 'branding';

export interface SettingDef {
  key: string;
  label: string;
  group: SettingGroup;
  type: SettingType;
  placeholder: string;
  help: string;
}

export interface BootstrapInfo {
  nodeEnv: string;
  port: number;
  databaseConfigured: boolean;
  jwtConfigured: boolean;
}

export interface SettingsResponse {
  defs: SettingDef[];
  values: Record<string, string | boolean>;
  bootstrap: BootstrapInfo;
}

export interface TestResult {
  ok: boolean;
  message: string;
}

export async function fetchSettings(): Promise<SettingsResponse> {
  return api<SettingsResponse>('/settings');
}

export async function saveSettings(
  values: Record<string, string | boolean | number>,
): Promise<{ ok: boolean; values: Record<string, string | boolean> }> {
  return api('/settings', { method: 'PUT', body: JSON.stringify({ values }) });
}

export async function testAiConnection(input?: { apiKey?: string; model?: string }): Promise<TestResult> {
  return api<TestResult>('/settings/test/ai', {
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  });
}

export async function testEmailConnection(input: {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}): Promise<TestResult> {
  return api<TestResult>('/settings/test/email', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function uploadLogo(file: File): Promise<{ url: string; logoUrl: string }> {
  const form = new FormData();
  form.append('logo', file);
  return api<{ url: string; logoUrl: string }>('/settings/company-logo', {
    method: 'POST',
    body: form,
  });
}

export async function removeLogo(): Promise<{ ok: boolean; logoUrl: string }> {
  return api<{ ok: boolean; logoUrl: string }>('/settings/company-logo', { method: 'DELETE' });
}

// Convenient SMTP provider presets for the UI.
export interface SmtpPreset {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  note?: string;
}

export const SMTP_PRESETS: SmtpPreset[] = [
  { id: 'custom', label: 'Custom / Manual', host: '', port: 587, secure: false },
  { id: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, secure: false, note: 'Use an App Password (2FA required), not your normal password.' },
  { id: 'outlook', label: 'Microsoft 365 / Outlook', host: 'smtp.office365.com', port: 587, secure: false },
  { id: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false, note: 'Username is literally "apikey"; password is your SendGrid API key.' },
  { id: 'mailgun', label: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  { id: 'brevo', label: 'Brevo (Sendinblue)', host: 'smtp-relay.brevo.com', port: 587, secure: false },
  { id: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.eu', port: 465, secure: true },
  { id: 'ses', label: 'Amazon SES', host: 'email-smtp.eu-west-1.amazonaws.com', port: 587, secure: false, note: 'Use your region-specific SMTP endpoint and SMTP credentials.' },
  { id: 'resend', label: 'Resend', host: 'smtp.resend.com', port: 587, secure: false, note: 'Username is literally "resend"; password is your Resend API key. Keep "Use TLS/SSL (port 465)" OFF (STARTTLS on 587) — turning it on causes "wrong version number" SSL errors.' },
];

// AI model choices for the dropdown.
export const GEMINI_MODELS = [
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (latest, balanced)' },
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (most intelligent)' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (fastest, cost-effective)' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (frontier-class value)' },
];
