import crypto from "crypto";
import { prisma } from "../db";
import { config } from "../config";
import { HttpError } from "../utils/httpError";
import { normalizeEmail } from "../utils/normalize";
import { getEmailSettings, getInternalSetting, getPublicBookingBaseUrl, setInternalSetting } from "./settings.service";

export async function suppressEmail(input: {
  email: string;
  reason: string;
  source: string;
  createdById?: string;
}) {
  const email = normalizeEmail(input.email);
  return prisma.emailSuppression.upsert({
    where: { email },
    update: { reason: input.reason, source: input.source, createdById: input.createdById },
    create: { ...input, email },
  });
}

export async function removeSuppression(email: string) {
  return prisma.emailSuppression.delete({ where: { email: normalizeEmail(email) } });
}

export async function getOrCreateUnsubscribeLink(pitchId: string, email: string) {
  const normalized = normalizeEmail(email);
  const link = await prisma.unsubscribeLink.upsert({
    where: { pitchId },
    update: { email: normalized },
    create: {
      pitchId,
      email: normalized,
      token: crypto.randomBytes(32).toString("base64url"),
    },
  });
  const publicBaseUrl = await getPublicBookingBaseUrl();
  return { ...link, url: `${publicBaseUrl}/unsubscribe/${link.token}` };
}

export async function markSenderVerified(userId?: string) {
  const verifiedAt = new Date().toISOString();
  await setInternalSetting("EMAIL_VERIFIED_AT", verifiedAt, userId);
  return verifiedAt;
}

export async function getDeliverabilityStatus() {
  const settings = await getEmailSettings();
  const now = new Date();
  const since24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [sent24Hours, sent30Days, bouncedRows, complainedRows, suppressionCount, verifiedAt, publicBaseUrl] = await Promise.all([
    prisma.pitch.count({ where: { sentAt: { gte: since24Hours } } }),
    prisma.pitch.count({ where: { sentAt: { gte: since30Days } } }),
    prisma.pitchEvent.findMany({ where: { type: "BOUNCED", createdAt: { gte: since30Days } }, distinct: ["pitchId"], select: { pitchId: true } }),
    prisma.pitchEvent.findMany({ where: { type: "COMPLAINED", createdAt: { gte: since30Days } }, distinct: ["pitchId"], select: { pitchId: true } }),
    prisma.emailSuppression.count(),
    getInternalSetting("EMAIL_VERIFIED_AT"),
    getPublicBookingBaseUrl(),
  ]);

  const bounceRate = sent30Days > 0 ? (bouncedRows.length / sent30Days) * 100 : 0;
  const complaintRate = sent30Days > 0 ? (complainedRows.length / sent30Days) * 100 : 0;
  const enoughVolume = sent30Days >= 20;
  const reasons: string[] = [];
  if (!settings.configured) reasons.push("SMTP sender is not configured.");
  if (!verifiedAt) reasons.push("SMTP connection has not been verified.");
  if (sent24Hours >= settings.dailySendLimit) reasons.push("The rolling 24-hour send limit has been reached.");
  if (enoughVolume && bounceRate >= settings.bounceThresholdPercent) reasons.push("The 30-day bounce threshold has been reached.");
  if (enoughVolume && complaintRate >= settings.complaintThresholdPercent) reasons.push("The 30-day complaint threshold has been reached.");

  const senderDomain = settings.fromEmail.split("@")[1]?.toLowerCase() || "";
  const baseDomain = (() => {
    try { return new URL(publicBaseUrl).hostname.toLowerCase(); } catch { return ""; }
  })();
  const localBookingDomain = ["localhost", "127.0.0.1", "::1"].includes(baseDomain);
  const domainsAligned = Boolean(senderDomain && baseDomain && (baseDomain === senderDomain || baseDomain.endsWith(`.${senderDomain}`)));

  return {
    configured: settings.configured,
    verifiedAt: verifiedAt || null,
    paused: reasons.length > 0,
    reasons,
    sent24Hours,
    dailySendLimit: settings.dailySendLimit,
    sent30Days,
    bounced30Days: bouncedRows.length,
    complained30Days: complainedRows.length,
    bounceRate: Number(bounceRate.toFixed(2)),
    complaintRate: Number(complaintRate.toFixed(3)),
    bounceThresholdPercent: settings.bounceThresholdPercent,
    complaintThresholdPercent: settings.complaintThresholdPercent,
    suppressionCount,
    sender: { email: settings.fromEmail, domain: senderDomain },
    publicBooking: { url: publicBaseUrl, domain: baseDomain, isLocal: localBookingDomain, domainsAligned },
    guidance: [
      { id: "custom-domain", ok: Boolean(senderDomain && !/gmail\.com$|outlook\.com$|hotmail\.com$|yahoo\.com$/i.test(senderDomain)), label: "Use a dedicated business sending domain" },
      { id: "domain-alignment", ok: domainsAligned || localBookingDomain, label: localBookingDomain ? "Local booking URL (configure a public domain before production)" : "Align the public booking domain with the sending domain" },
      { id: "webhook", ok: Boolean(settings.webhookSecret), label: "Configure signed delivery and complaint webhooks" },
      { id: "https", ok: publicBaseUrl.startsWith("https://") || !config.isProduction, label: "Serve public links over HTTPS" },
      { id: "verified", ok: Boolean(verifiedAt), label: "Verify the SMTP connection after changing credentials" },
    ],
  };
}

export async function assertOutreachAllowed(email: string) {
  const normalized = normalizeEmail(email);
  const suppression = await prisma.emailSuppression.findUnique({ where: { email: normalized } });
  if (suppression) {
    throw new HttpError(409, "This recipient is on the suppression list and cannot receive outreach.", "RECIPIENT_SUPPRESSED");
  }
  const status = await getDeliverabilityStatus();
  if (!status.configured) throw new HttpError(503, "Email sending is not configured.", "SMTP_UNCONFIGURED");
  if (!status.verifiedAt) throw new HttpError(409, "Verify the SMTP connection before sending outreach.", "SENDER_NOT_VERIFIED");
  if (status.sent24Hours >= status.dailySendLimit) throw new HttpError(429, "The workspace daily outreach limit has been reached.", "SEND_LIMIT_REACHED");
  if (status.sent30Days >= 20 && status.bounceRate >= status.bounceThresholdPercent) {
    throw new HttpError(409, "Outreach is paused because the bounce threshold was reached.", "BOUNCE_THRESHOLD_REACHED");
  }
  if (status.sent30Days >= 20 && status.complaintRate >= status.complaintThresholdPercent) {
    throw new HttpError(409, "Outreach is paused because the complaint threshold was reached.", "COMPLAINT_THRESHOLD_REACHED");
  }
}
