// Resend delivery webhook: maps Resend email events (delivered/opened/bounced)
// back to pitches via the "pitchId" tag and updates their status.
// Set RESEND_WEBHOOK_SECRET (the Signing Secret from Resend) to verify signatures.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db";
import { pitchStatusToDb } from "../utils/serializers";
import { getEmailSettings } from "../services/settings.service";
import { verifyResendWebhook, type RawBodyRequest } from "../utils/resendWebhook";

export const webhookRouter = Router();

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests.", code: "RATE_LIMITED" },
});
webhookRouter.use(webhookLimiter);

webhookRouter.post("/resend", async (req: RawBodyRequest, res) => {
  const { webhookSecret } = await getEmailSettings();
  if (!webhookSecret) {
    return res.status(503).json({ error: "Resend webhook signing secret is not configured", code: "WEBHOOK_NOT_CONFIGURED" });
  }

  let evt: { type?: string; data?: { tags?: Array<{ name: string; value: string }> } };
  try {
    evt = verifyResendWebhook(req, webhookSecret) as typeof evt;
  } catch {
    return res.status(401).json({ error: "Invalid signature", code: "BAD_SIGNATURE" });
  }

  const type = evt?.type;
  const tags = evt?.data?.tags || [];
  const pitchId = tags.find((t) => t.name === "pitchId")?.value;

  const updates: Record<string, unknown> = {};
  if (type === "email.delivered") updates.status = pitchStatusToDb("Delivered");
  else if (type === "email.opened") updates.opened = true;
  else if (type === "email.bounced" || type === "email.complained") updates.status = pitchStatusToDb("Failed");
  else if (type === "email.clicked") updates.opened = true;

  if (pitchId && Object.keys(updates).length > 0) {
    try {
      const pitch = await prisma.pitch.update({ where: { id: pitchId }, data: updates });
      
      const eventType = type === "email.delivered" ? "DELIVERED" :
                         type === "email.opened" ? "OPENED" :
                         type === "email.clicked" ? "CLICKED" :
                         type === "email.bounced" || type === "email.complained" ? "BOUNCED" :
                         type === "email.replied" ? "REPLIED" : null;
      
      if (eventType) {
        await prisma.pitchEvent.create({
          data: { pitchId, type: eventType as any },
        });
      }
    } catch {
      /* pitch may have been deleted; ignore */
    }
  }

  return res.status(200).json({ ok: true, type, pitchId: pitchId ?? null });
});
