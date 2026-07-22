import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, notFound } from "../utils/httpError";
import { suppressEmail } from "../services/compliance.service";
import { recordActivationEvent } from "../services/activation.service";
import { stopSequencesForLead } from "../services/sequenceStop.service";

export const publicUnsubscribeRouter = Router();
publicUnsubscribeRouter.use(rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));

const tokenSchema = z.string().min(32).max(128);
const parseToken = (value: string) => {
  const result = tokenSchema.safeParse(value);
  if (!result.success) throw badRequest("Invalid unsubscribe link.");
  return result.data;
};
const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  return local && domain ? `${local.slice(0, 2)}***@${domain}` : "recipient";
};

async function findLink(token: string) {
  const link = await prisma.unsubscribeLink.findUnique({ where: { token }, include: { pitch: { select: { id: true, leadId: true } } } });
  if (!link) throw notFound("This unsubscribe link is invalid.");
  return link;
}

publicUnsubscribeRouter.get("/:token", asyncHandler(async (req, res) => {
  const link = await findLink(parseToken(String(req.params.token)));
  const suppressed = Boolean(await prisma.emailSuppression.findUnique({ where: { email: link.email } }));
  res.json({ emailMasked: maskEmail(link.email), suppressed });
}));

publicUnsubscribeRouter.post("/:token", asyncHandler(async (req, res) => {
  const link = await findLink(parseToken(String(req.params.token)));
  await suppressEmail({ email: link.email, reason: "Recipient unsubscribed", source: "UNSUBSCRIBE" });
  await recordActivationEvent({ type: "RECIPIENT_UNSUBSCRIBED", leadId: link.pitch.leadId, pitchId: link.pitch.id });
  res.json({ ok: true, emailMasked: maskEmail(link.email) });
}));
