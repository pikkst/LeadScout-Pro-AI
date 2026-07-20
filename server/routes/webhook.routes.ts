// Resend delivery webhook: maps Resend email events (delivered/opened/bounced)
// back to pitches via the "pitchId" tag and updates their status.
// Set RESEND_WEBHOOK_SECRET (the Signing Secret from Resend) to verify signatures.
import { Router, Request } from "express";
import crypto from "crypto";
import { prisma } from "../db";
import { pitchStatusToDb } from "../utils/serializers";

export const webhookRouter = Router();

function verifyResendSignature(req: Request, secret: string): boolean {
  const signature = req.header("svix-signature") || req.header("resend-signature");
  const timestamp = req.header("svix-timestamp");
  const rawBody = (req as Request & { rawBody?: string }).rawBody || "";
  if (!signature || !timestamp) return false;
  // Resend signatures look like: <timestamp>.<uuid>.<hex>
  const parts = signature.split(".");
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  // Accept either the full "t.uid.sig" form or a bare hex signature.
  const candidate = parts[parts.length - 1];
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

webhookRouter.post("/resend", async (req: Request & { rawBody?: string }, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret && !verifyResendSignature(req, secret)) {
    return res.status(401).json({ error: "Invalid signature", code: "BAD_SIGNATURE" });
  }

  const evt = req.body as { type?: string; data?: { tags?: Array<{ name: string; value: string }> } };
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
