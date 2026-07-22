// Runtime settings service.
// Editable application settings live in the DB (app_settings) and override .env defaults.
// Secrets are encrypted at rest. Values are cached and invalidated on save.
import { prisma } from "../db";
import { config } from "../config";
import { decryptSecretWithKeyring, encryptSecret } from "../utils/crypto";
import { badRequest } from "../utils/httpError";

export function normalizePublicBookingBaseUrl(input: string): string {
  let parsed: URL;
  try { parsed = new URL(input); }
  catch { throw badRequest("Enter a valid public booking URL, for example https://book.example.com."); }
  if (parsed.username || parsed.password) throw badRequest("The public booking URL cannot contain credentials.");
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocal)) {
    throw badRequest("Use HTTPS for a public booking URL. HTTP is allowed only for localhost.");
  }
  if ((parsed.pathname && parsed.pathname !== "/") || parsed.search || parsed.hash) {
    throw badRequest("Enter only the public origin without a path, query, or fragment.");
  }
  return parsed.origin;
}

export function resolvePublicBookingBaseUrl(environmentValue: string | undefined, fallback: string): string {
  return normalizePublicBookingBaseUrl(environmentValue?.trim() || fallback);
}

function toAbsoluteUrl(input: string): string {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return input;
  const base = config.baseUrl.replace(/\/$/, "");
  const path = input.startsWith("/") ? input : `/${input}`;
  return `${base}${path}`;
}

export type SettingType = "string" | "number" | "boolean" | "secret";

export interface SettingDef {
  key: string;
  label: string;
  group: "ai" | "email" | "security" | "company";
  type: SettingType;
  /** Fallback taken from .env / config when there is no DB value. */
  envDefault: () => string;
  placeholder?: string;
  help?: string;
}

// The full catalog of UI-editable settings.
export const SETTING_DEFS: SettingDef[] = [
  // --- AI ---
  {
    key: "GEMINI_API_KEY",
    label: "Gemini API Key",
    group: "ai",
    type: "secret",
    envDefault: () => process.env.GEMINI_API_KEY || "",
    placeholder: "AIza...",
    help: "Google Gemini API key used for scouting, verification and pitch generation.",
  },
  {
    key: "GEMINI_MODEL",
    label: "Gemini Model",
    group: "ai",
    type: "string",
    envDefault: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
    placeholder: "gemini-2.5-flash",
    help: "Model name, e.g. gemini-2.5-flash or gemini-2.5-pro.",
  },

  // --- Email / SMTP ---
  {
    key: "SMTP_HOST",
    label: "SMTP Host",
    group: "email",
    type: "string",
    envDefault: () => process.env.SMTP_HOST || "",
    placeholder: "smtp.gmail.com",
  },
  {
    key: "SMTP_PORT",
    label: "SMTP Port",
    group: "email",
    type: "number",
    envDefault: () => process.env.SMTP_PORT || "587",
    placeholder: "587",
  },
  {
    key: "SMTP_SECURE",
    label: "Use TLS/SSL (port 465)",
    group: "email",
    type: "boolean",
    envDefault: () => process.env.SMTP_SECURE || "false",
    help: "Enable for port 465. Leave off for 587 (STARTTLS).",
  },
  {
    key: "SMTP_USER",
    label: "SMTP Username",
    group: "email",
    type: "string",
    envDefault: () => process.env.SMTP_USER || "",
    placeholder: "you@unitelglobal.com",
  },
  {
    key: "SMTP_PASS",
    label: "SMTP Password / App Password",
    group: "email",
    type: "secret",
    envDefault: () => process.env.SMTP_PASS || "",
  },
  {
    key: "SMTP_FROM_NAME",
    label: "Sender Name",
    group: "email",
    type: "string",
    envDefault: () => process.env.SMTP_FROM_NAME || "Unitel Global — Carrier Relations",
  },
  {
    key: "SMTP_FROM_EMAIL",
    label: "Sender Email",
    group: "email",
    type: "string",
    envDefault: () => process.env.SMTP_FROM_EMAIL || "info@unitelglobal.com",
    placeholder: "info@unitelglobal.com",
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend API Key",
    group: "email",
    type: "secret",
    envDefault: () => process.env.RESEND_API_KEY || "",
    help: "Used for inbound webhook fetches and Resend native APIs.",
  },
  {
    key: "RESEND_WEBHOOK_SECRET",
    label: "Resend Webhook Signing Secret",
    group: "email",
    type: "secret",
    envDefault: () => process.env.RESEND_WEBHOOK_SECRET || "",
    placeholder: "whsec_...",
    help: "Required to verify Resend delivery and inbound webhook signatures.",
  },
  {
    key: "EMAIL_DAILY_SEND_LIMIT",
    label: "Daily Outreach Limit",
    group: "email",
    type: "number",
    envDefault: () => process.env.EMAIL_DAILY_SEND_LIMIT || "100",
    placeholder: "100",
    help: "Maximum outreach pitches sent across this workspace in a rolling 24-hour window.",
  },
  {
    key: "EMAIL_BOUNCE_THRESHOLD_PERCENT",
    label: "Bounce Pause Threshold (%)",
    group: "email",
    type: "number",
    envDefault: () => process.env.EMAIL_BOUNCE_THRESHOLD_PERCENT || "5",
    placeholder: "5",
    help: "Pause outreach when the 30-day bounce rate reaches this percentage after at least 20 sends.",
  },
  {
    key: "EMAIL_COMPLAINT_THRESHOLD_PERCENT",
    label: "Complaint Pause Threshold (%)",
    group: "email",
    type: "number",
    envDefault: () => process.env.EMAIL_COMPLAINT_THRESHOLD_PERCENT || "0.3",
    placeholder: "0.3",
    help: "Pause outreach when the 30-day complaint rate reaches this percentage after at least 20 sends.",
  },
  {
    key: "PUBLIC_BOOKING_BASE_URL",
    label: "Public Booking URL",
    group: "email",
    type: "string",
    envDefault: () => resolvePublicBookingBaseUrl(process.env.PUBLIC_BOOKING_BASE_URL, config.baseUrl),
    placeholder: "https://book.example.com",
    help: "Public origin used for booking and unsubscribe links. DNS and HTTPS must already route this address to LeadScout.",
  },
  {
    key: "GOOGLE_CLIENT_ID",
    label: "Google Client ID",
    group: "email",
    type: "string",
    envDefault: () => process.env.GOOGLE_CLIENT_ID || "",
    placeholder: "123456789-abc.apps.googleusercontent.com",
  },
  {
    key: "GOOGLE_CLIENT_SECRET",
    label: "Google Client Secret",
    group: "email",
    type: "secret",
    envDefault: () => process.env.GOOGLE_CLIENT_SECRET || "",
  },

  // --- Security ---
  {
    key: "ALLOW_PUBLIC_REGISTRATION",
    label: "Allow public self-registration",
    group: "security",
    type: "boolean",
    envDefault: () => process.env.ALLOW_PUBLIC_REGISTRATION || "false",
    help: "When off, only admins can create new accounts.",
  },

  // --- Company Profile (used by the AI agents when scouting & pitching) ---
  {
    key: "COMPANY_NAME",
    label: "Company Name",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_NAME || "Your Company",
    placeholder: "Acme Communications Ltd.",
  },
  {
    key: "COMPANY_LOGO_URL",
    label: "Company Logo URL",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_LOGO_URL || "",
    placeholder: "https://yourcompany.com/logo.png",
    help: "Publicly reachable image URL shown in outreach emails. Leave blank to use a text header.",
  },
  {
    key: "COMPANY_WEBSITE",
    label: "Company Website",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_WEBSITE || "",
    placeholder: "https://yourcompany.com",
  },
  {
    key: "COMPANY_DESCRIPTION",
    label: "What your company does",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_DESCRIPTION || "",
    placeholder: "Brief description of your business, market and positioning.",
  },
  {
    key: "COMPANY_OFFERINGS",
    label: "Products / Services you sell",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_OFFERINGS || "",
    placeholder: "Wholesale voice termination, SMS API, CPaaS, IoT connectivity...",
  },
  {
    key: "COMPANY_VALUE_PROP",
    label: "Value proposition / differentiators",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_VALUE_PROP || "",
    placeholder: "Why customers choose you: rates, quality, coverage, support...",
  },
  {
    key: "COMPANY_CONTACT_EMAIL",
    label: "Contact Email (signature)",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_CONTACT_EMAIL || "",
    placeholder: "partnerships@yourcompany.com",
  },
  {
    key: "COMPANY_LANGUAGE",
    label: "Preferred outreach language",
    group: "company",
    type: "string",
    envDefault: () => process.env.COMPANY_LANGUAGE || "English",
    placeholder: "English",
    help: "Default language for generated pitches (auto-detect still applies per target).",
  },
];

const DEF_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]));
const SECRET_KEYS = new Set(SETTING_DEFS.filter((d) => d.type === "secret").map((d) => d.key));

// In-memory cache of resolved (decrypted) values.
let cache: Record<string, string> | null = null;

async function loadAll(): Promise<Record<string, string>> {
  if (cache && Object.keys(cache).length > 0) return cache;
  const rows = await prisma.appSetting.findMany();
  const dbValues: Record<string, string> = {};
  for (const row of rows) {
    if (!row.isSecret) {
      dbValues[row.key] = row.value;
      continue;
    }
    const decrypted = decryptSecretWithKeyring(row.value);
    dbValues[row.key] = decrypted.value;
    if (decrypted.decrypted && decrypted.needsRotation) {
      await prisma.appSetting.update({
        where: { key: row.key },
        data: { value: encryptSecret(decrypted.value) },
      });
    }
  }
  const resolved: Record<string, string> = {};
  for (const def of SETTING_DEFS) {
    const dbVal = dbValues[def.key];
    resolved[def.key] = dbVal !== undefined && dbVal !== "" ? dbVal : def.envDefault();
  }
  cache = resolved;
  return resolved;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

/** Get a single resolved setting value (string form). */
export async function getSetting(key: string): Promise<string> {
  const all = await loadAll();
  return all[key] ?? "";
}

export async function getSettings(): Promise<Record<string, string>> {
  return { ...(await loadAll()) };
}

// Typed convenience getters used by services.
export async function getAiSettings() {
  const s = await loadAll();
  return {
    apiKey: s.GEMINI_API_KEY || "",
    model: s.GEMINI_MODEL || "gemini-2.5-flash",
    configured: Boolean(s.GEMINI_API_KEY),
  };
}

export async function getEmailSettings() {
  const s = await loadAll();
  return {
    host: s.SMTP_HOST || "",
    port: parseInt(s.SMTP_PORT || "587", 10),
    secure: s.SMTP_SECURE === "true",
    user: s.SMTP_USER || "",
    pass: s.SMTP_PASS || "",
    fromName: s.SMTP_FROM_NAME || "Unitel Global — Carrier Relations",
    fromEmail: s.SMTP_FROM_EMAIL || "info@unitelglobal.com",
    configured: Boolean(s.SMTP_HOST && s.SMTP_USER && s.SMTP_PASS),
    providerApiKey: s.RESEND_API_KEY || "",
    webhookSecret: s.RESEND_WEBHOOK_SECRET || "",
    dailySendLimit: Math.max(1, parseInt(s.EMAIL_DAILY_SEND_LIMIT || "100", 10) || 100),
    bounceThresholdPercent: Math.max(0, Number(s.EMAIL_BOUNCE_THRESHOLD_PERCENT || "5") || 5),
    complaintThresholdPercent: Math.max(0, Number(s.EMAIL_COMPLAINT_THRESHOLD_PERCENT || "0.3") || 0.3),
  };
}

export async function getPublicBookingBaseUrl(): Promise<string> {
  const value = (await getSetting("PUBLIC_BOOKING_BASE_URL")).trim();
  return resolvePublicBookingBaseUrl(value, config.baseUrl);
}

export async function getInternalSetting(key: string): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? "";
}

export async function setInternalSetting(key: string, value: string, updatedById?: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value, isSecret: false, updatedById },
    create: { key, value, isSecret: false, updatedById },
  });
}

export async function getAllowPublicRegistration(): Promise<boolean> {
  const s = await loadAll();
  return s.ALLOW_PUBLIC_REGISTRATION === "true";
}

export interface CompanyProfile {
  name: string;
  logoUrl: string;
  website: string;
  description: string;
  offerings: string;
  valueProp: string;
  contactEmail: string;
  language: string;
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const s = await loadAll();
  return {
    name: s.COMPANY_NAME || "Your Company",
    logoUrl: toAbsoluteUrl(s.COMPANY_LOGO_URL || ""),
    website: s.COMPANY_WEBSITE || "",
    description: s.COMPANY_DESCRIPTION || "",
    offerings: s.COMPANY_OFFERINGS || "",
    valueProp: s.COMPANY_VALUE_PROP || "",
    contactEmail: s.COMPANY_CONTACT_EMAIL || "",
    language: s.COMPANY_LANGUAGE || "English",
  };
}

/** Persist a batch of settings. Only known keys are accepted. Secrets are encrypted. */
export async function updateSettings(
  updates: Record<string, string>,
  updatedById?: string,
): Promise<void> {
  const entries = Object.entries(updates).filter(([k]) => DEF_BY_KEY.has(k));
  for (const [key, rawValue] of entries) {
    const def = DEF_BY_KEY.get(key)!;
    const isSecret = def.type === "secret";
    const normalizedValue = key === "PUBLIC_BOOKING_BASE_URL"
      ? normalizePublicBookingBaseUrl(String(rawValue))
      : String(rawValue);
    const value = isSecret ? encryptSecret(normalizedValue) : normalizedValue;
    await prisma.appSetting.upsert({
      where: { key },
      update: { value, isSecret, updatedById },
      create: { key, value, isSecret, updatedById },
    });
  }
  invalidateSettingsCache();
}

/**
 * Return settings for the admin UI. Secret values are masked (never sent to the client);
 * instead a boolean `<KEY>__set` flag indicates whether a value exists.
 */
export async function getSettingsForUi() {
  const s = await loadAll();
  const out: Record<string, string | boolean> = {};
  for (const def of SETTING_DEFS) {
    if (def.type === "secret") {
      out[`${def.key}__set`] = Boolean(s[def.key]);
      out[def.key] = "";
    } else {
      out[def.key] = s[def.key] ?? def.envDefault();
    }
  }
  return out;
}

export function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key);
}

// Read-only bootstrap info (from .env, shown but not editable in the UI).
export function getBootstrapInfo() {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    databaseConfigured: Boolean(config.databaseUrl),
    jwtConfigured: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16),
  };
}
