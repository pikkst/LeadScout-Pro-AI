// Email service: sends outreach pitches via configured SMTP using Nodemailer.
// SMTP configuration is read from runtime settings (DB-backed, editable in the UI).
import nodemailer, { type Transporter } from "nodemailer";
import { HttpError } from "../utils/httpError";
import { getEmailSettings } from "./settings.service";
import { config } from "../config";

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
}

export async function sendPitchEmail(input: SendPitchInput): Promise<{ messageId: string }> {
  const { tx, fromName, fromEmail } = await getTransporter();
  const from = `"${fromName}" <${fromEmail}>`;
  try {
    const info = await tx.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
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

/** Invalidate the cached transporter (call after settings change). */
export function resetEmailTransport(): void {
  transporter = null;
  transporterSignature = "";
}
