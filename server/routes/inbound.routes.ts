// Inbound email webhook: accepts Resend `email.received` events,
// fetches the full email via Resend API, and matches replies back to pitches by Message-ID.
import { Router } from "express";
import { prisma } from "../db";
import { logActivity } from "../utils/activity";
import { getEmailSettings } from "../services/settings.service";

function extractHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key) headers[key] = value;
  }
  return headers;
}

function extractHeaderValue(headers: Record<string, string>, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  if (!value) return undefined;
  const first = value.split(/\s+/)[0];
  return first.replace(/[<>]/g, "").trim() || undefined;
}

async function fetchFullEmail(emailId: string): Promise<string | null> {
  try {
    const settings = await getEmailSettings();
    if (!settings.configured || !settings.providerApiKey) return null;

    const res = await fetch(`https://api.resend.com/received_emails/${encodeURIComponent(emailId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${settings.providerApiKey}`,
      },
    });

    if (!res.ok) {
      console.error(`[inbound] failed to fetch email ${emailId}: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>;
    const raw = (data?.data as Record<string, unknown> | undefined)?.raw ?? ((data as Record<string, unknown> | undefined)?.raw ?? null);
    if (typeof raw === "string") return raw;
    return null;
  } catch (err) {
    console.error("[inbound] failed to fetch full email", err);
    return null;
  }
}

async function findPitchByMessageId(messageId: string | undefined) {
  if (!messageId) return null;
  const trimmed = messageId.replace(/[<>]/g, "").trim();
  if (!trimmed) return null;
  return prisma.pitch.findFirst({
    where: { sentMessageId: trimmed },
    include: { lead: true },
  });
}

export const inboundRouter = Router();

inboundRouter.post("/resend", async (req, res) => {
  const event = req.body as { type?: string; data?: { email_id?: string; message_id?: string; to?: string[] } } | null;
  if (!event || event.type !== "email.received" || !event.data?.email_id) {
    return res.status(200).json({ ok: true, matched: false, reason: "ignored" });
  }

  const rawEmail = await fetchFullEmail(event.data.email_id);
  const headers = rawEmail ? extractHeaders(rawEmail) : {};
  const inReplyTo = extractHeaderValue(headers, "in-reply-to") || extractHeaderValue(headers, "references");
  const pitch = await findPitchByMessageId(inReplyTo);

  if (pitch) {
    await prisma.pitch.update({
      where: { id: pitch.id },
      data: { status: "REPLIED", updatedAt: new Date() },
    });

    await prisma.lead.updateMany({
      where: { id: pitch.leadId, stage: { in: ["CONTACTED", "DISCOVERED"] } },
      data: { stage: "NEGOTIATION", lastContactedAt: new Date() },
    });

    await logActivity({
      action: "PITCH_REPLIED",
      detail: `Inbound reply detected: ${pitch.leadName}`,
      userId: pitch.lead.createdById || pitch.createdById || "unknown",
      leadId: pitch.leadId,
    });
  }

  res.status(200).json({ ok: true, matched: !!pitch, pitchId: pitch?.id ?? null });
});
