// Email service: sends outreach pitches via configured SMTP using Nodemailer.
// SMTP configuration is read from runtime settings (DB-backed, editable in the UI).
import nodemailer, { type Transporter } from "nodemailer";
import { HttpError } from "../utils/httpError";
import { getEmailSettings } from "./settings.service";
import { config } from "../config";
import { assertOutreachAllowed } from "./compliance.service";

let transporter: Transporter | null = null;
let transporterSignature = "";

async function getTransporter(): Promise<{ tx: Transporter; fromName: string; fromEmail: string }> {
  const s = await getEmailSettings();
  if (!s.configured) {
    throw new HttpError(
      503,
      "Email sending is not configured. Add SMTP host, username and password in Settings → Email.",
      "SMTP_UNCONFIGURED",
    );
  }
  const signature = `${s.host}:${s.port}:${s.secure}:${s.user}:${s.pass}`;
  if (!transporter || transporterSignature !== signature) {
    transporter = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: { user: s.user, pass: s.pass },
    });
    transporterSignature = signature;
  }
  return { tx: transporter, fromName: s.fromName, fromEmail: s.fromEmail };
}

export interface SendPitchInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  pitchId?: string;
  inReplyToMessageId?: string;
  references?: string[];
  bookingUrl?: string;
  unsubscribeUrl?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

export function appendBookingCallToAction(html: string, text: string, bookingUrl?: string) {
  if (!bookingUrl) return { html, text };
  const safeUrl = escapeHtml(bookingUrl);
  const cta = `
    <div style="margin:28px 0;padding:20px;border-radius:12px;background:#f0f9ff;text-align:center">
      <p style="margin:0 0 14px;color:#0f172a;font-weight:600">Would you like to discuss this?</p>
      <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:700">Book a meeting</a>
    </div>`;
  const nextHtml = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${cta}</body>`) : `${html}${cta}`;
  return { html: nextHtml, text: `${text}\n\nBook a meeting: ${bookingUrl}` };
}

export function appendComplianceFooter(html: string, text: string, unsubscribeUrl?: string) {
  if (!unsubscribeUrl) return { html, text };
  const safeUrl = escapeHtml(unsubscribeUrl);
  const footer = `
    <div style="margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">
      You are receiving this one-to-one business message because we believe it may be relevant to your role.
      <a href="${safeUrl}" style="color:#475569">Unsubscribe from future outreach</a>.
    </div>`;
  const nextHtml = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : `${html}${footer}`;
  return { html: nextHtml, text: `${text}\n\nUnsubscribe from future outreach: ${unsubscribeUrl}` };
}

/**
 * The only outbound pitch delivery entry point. Route handlers, schedulers and
 * sequence workers must use this function so suppression and safety policy are
 * enforced consistently before SMTP delivery.
 */
export async function sendCompliantOutreachEmail(input: SendPitchInput): Promise<{ messageId: string }> {
  await assertOutreachAllowed(input.to);
  const { tx, fromName, fromEmail } = await getTransporter();
  const from = `"${fromName}" <${fromEmail}>`;
  const bookingContent = appendBookingCallToAction(input.html, input.text, input.bookingUrl);
  const content = appendComplianceFooter(bookingContent.html, bookingContent.text, input.unsubscribeUrl);
  try {
    const info = await tx.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: content.html,
      text: content.text,
      replyTo: input.replyTo || config.inboundEmailAddress || fromEmail,
      inReplyTo: input.inReplyToMessageId,
      references: input.references,
      // Resend tags let the delivery webhook map events back to this pitch.
      ...(input.pitchId
        ? { tags: [{ name: "pitchId", value: input.pitchId }] }
        : {}),
    });
    return { messageId: info.messageId };
  } catch (err) {
    throw new HttpError(502, `Failed to send email: ${(err as Error).message}`, "SMTP_SEND_FAILED");
  }
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function compactDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function buildIcsEvent(params: {
  meetingId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  description: string;
  timezone?: string;
}): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const timezone = params.timezone || "Europe/Tallinn";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LeadScout PRO AI//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    `X-WR-TIMEZONE:${escapeIcs(timezone)}`,
    "BEGIN:VEVENT",
    `UID:${escapeIcs(params.meetingId)}@leadscout`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${escapeIcs(timezone)}:${compactDateTime(params.date, params.time)}`,
    `DTEND;TZID=${escapeIcs(timezone)}:${compactDateTime(params.date, addMinutesToTime(params.time, params.duration))}`,
    `SUMMARY:${escapeIcs(params.title)}`,
    `DESCRIPTION:${escapeIcs(params.description)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Verify SMTP connectivity. Returns a clear result for the admin "Test Connection" button. */
export async function verifySmtp(): Promise<{ ok: boolean; message: string }> {
  try {
    const { tx } = await getTransporter();
    await tx.verify();
    return { ok: true, message: "SMTP connection successful." };
  } catch (err) {
    if (err instanceof HttpError) return { ok: false, message: err.message };
    return { ok: false, message: (err as Error).message };
  }
}

/**
 * Verify SMTP using an ad-hoc configuration (used before saving, so admins can
 * test credentials they just typed without persisting them first).
 */
export async function verifySmtpConfig(cfg: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, message: "Host, username and password are required." };
  }
  try {
    const tx = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await tx.verify();
    return { ok: true, message: "SMTP connection successful." };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function sendMeetingNotificationEmail(params: {
  to: string;
  agentName: string;
  leadName: string;
  leadEmail: string;
  date: string;
  time: string;
  title: string;
  meetingId?: string;
  duration?: number;
  timezone?: string;
}): Promise<{ messageId?: string; error?: string }> {
  try {
    const { tx, fromName, fromEmail } = await getTransporter();
    const subject = `New meeting booked: ${params.title}`;
    const html = `
      <p>Hi ${params.agentName},</p>
      <p>A new meeting has been booked with you:</p>
      <ul>
        <li><strong>Meeting:</strong> ${params.title}</li>
        <li><strong>Date:</strong> ${params.date}</li>
        <li><strong>Time:</strong> ${params.time}</li>
        <li><strong>With:</strong> ${params.leadName} (${params.leadEmail})</li>
      </ul>
    `;
    const text = `New meeting booked: ${params.title} on ${params.date} at ${params.time} with ${params.leadName} (${params.leadEmail})`;
    const info = await tx.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject,
      html,
      text,
      ...(params.meetingId ? {
        icalEvent: {
          method: "REQUEST",
          filename: "meeting.ics",
          content: buildIcsEvent({
            meetingId: params.meetingId,
            title: params.title,
            date: params.date,
            time: params.time,
            duration: params.duration ?? 30,
            description: `Meeting with ${params.leadName} (${params.leadEmail})`,
            timezone: params.timezone,
          }),
        },
      } : {}),
    });
    return { messageId: info.messageId };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function sendBookingConfirmationEmail(params: {
  to: string;
  attendeeName: string;
  agentName: string;
  meetingId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  timezone?: string;
}): Promise<{ messageId?: string; error?: string }> {
  try {
    const { tx, fromName, fromEmail } = await getTransporter();
    const description = `Meeting with ${params.agentName}`;
    const html = `
      <p>Hi ${escapeHtml(params.attendeeName)},</p>
      <p>Your meeting with <strong>${escapeHtml(params.agentName)}</strong> is confirmed.</p>
      <ul>
        <li><strong>Date:</strong> ${escapeHtml(params.date)}</li>
        <li><strong>Time:</strong> ${escapeHtml(params.time)}</li>
        <li><strong>Duration:</strong> ${params.duration} minutes</li>
      </ul>
      <p>The attached calendar invitation works with Google Calendar, Outlook, Apple Calendar and other calendar apps.</p>`;
    const info = await tx.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject: `Meeting confirmed: ${params.title}`,
      html,
      text: `Meeting confirmed with ${params.agentName} on ${params.date} at ${params.time} for ${params.duration} minutes.`,
      icalEvent: {
        method: "REQUEST",
        filename: "meeting.ics",
        content: buildIcsEvent({
          meetingId: params.meetingId,
          title: params.title,
          date: params.date,
          time: params.time,
          duration: params.duration,
          description,
          timezone: params.timezone,
        }),
      },
    });
    return { messageId: info.messageId };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
export function resetEmailTransport(): void {
  transporter = null;
  transporterSignature = "";
}
