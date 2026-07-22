// Pitch routes: generate AI outreach, persist drafts, edit, and send via SMTP.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { serializePitch, pitchStatusToDb } from "../utils/serializers";
import { generatePitch } from "../services/ai.service";
import { sendPitchEmail } from "../services/email.service";
import { recommendSendTime } from "../services/ai.service";
import { logActivity } from "../utils/activity";
import { param } from "../utils/param";
import { getEmailSettings } from "../services/settings.service";

export const pitchesRouter = Router();
pitchesRouter.use(requireAuth);

// ---- List all pitches ----
pitchesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const pitches = await prisma.pitch.findMany({
      orderBy: { createdAt: "desc" },
      include: { events: { orderBy: { createdAt: "desc" } } },
    });
    res.json(pitches.map(serializePitch));
  }),
);

// ---- Generate + persist a pitch for a stored lead ----
const generateSchema = z.object({
  leadId: z.string(),
  focus: z.string(),
  preferredLanguage: z.string().default("Auto-Detect"),
  templateId: z.string().optional().nullable(),
});

pitchesRouter.post(
  "/generate",
  validate({ body: generateSchema }),
  asyncHandler(async (req, res) => {
    const { leadId, focus, preferredLanguage, templateId } = req.body as z.infer<typeof generateSchema>;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw notFound("Lead not found");

    let template = null;
    if (templateId) {
      const tpl = await prisma.pitchTemplate.findUnique({ where: { id: templateId } });
      if (tpl) {
        template = { subject: tpl.subject, htmlContent: tpl.htmlContent, textContent: tpl.textContent };
      }
    }

    const emailSettings = await getEmailSettings();
    const generated = await generatePitch(
      { name: lead.name, category: lead.category, website: lead.website, description: lead.description },
      focus,
      preferredLanguage,
      template,
      req.user!.name,
      emailSettings.fromName,
      emailSettings.fromEmail,
    );

    const pitch = await prisma.pitch.create({
      data: {
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: lead.email,
        subject: generated.subject,
        htmlContent: generated.htmlContent,
        textContent: generated.textContent,
        language: generated.detectedLanguage,
        status: "DRAFT",
        createdById: req.user!.id,
      },
    });
    await logActivity({ action: "PITCH_GENERATED", detail: lead.name, userId: req.user!.id, leadId: lead.id });
    res.status(201).json(serializePitch(pitch));
  }),
);

// ---- Update a pitch (edit subject/body) ----
const updateSchema = z.object({
  subject: z.string().optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  status: z.enum(["Draft", "Sent", "Delivered", "Replied", "Failed"]).optional(),
  opened: z.boolean().optional(),
});

pitchesRouter.patch(
  "/:id",
  validate({ body: updateSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateSchema>;
    const data: Record<string, unknown> = {};
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.htmlContent !== undefined) data.htmlContent = body.htmlContent;
    if (body.textContent !== undefined) data.textContent = body.textContent;
    if (body.status !== undefined) data.status = pitchStatusToDb(body.status);
    if (body.opened !== undefined) data.opened = body.opened;

    const pitch = await prisma.pitch.update({ where: { id: param(req, "id") }, data });
    res.json(serializePitch(pitch));
  }),
);

// ---- Send a pitch via SMTP ----
pitchesRouter.post(
  "/:id/send",
  asyncHandler(async (req, res) => {
    const pitch = await prisma.pitch.findUnique({ where: { id: param(req, "id") } });
    if (!pitch) throw notFound("Pitch not found");

    const senderName = req.user!.name;
    const senderEmail = req.user!.email;

    const previous = pitch.inReplyToId
      ? ((await prisma.pitch.findUnique({ where: { id: pitch.inReplyToId } })) as any)
      : null;

    const sendResult = await sendPitchEmail({
      to: pitch.leadEmail,
      subject: pitch.subject,
      html: pitch.htmlContent,
      text: pitch.textContent,
      replyTo: senderEmail,
      pitchId: pitch.id,
      inReplyToMessageId: previous?.sentMessageId || undefined,
      references: previous?.sentMessageId ? [previous.sentMessageId] : undefined,
    });

    const updated = await prisma.pitch.update({
      where: { id: pitch.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        sentFromName: senderName,
        sentFromEmail: senderEmail,
        replyToEmail: senderEmail,
        sentMessageId: sendResult.messageId,
      } as any,
    });

    await prisma.pitchEvent.create({
      data: { pitchId: pitch.id, type: "SENT" },
    });

    await prisma.lead.updateMany({
      where: { id: pitch.leadId, stage: "DISCOVERED" },
      data: { stage: "CONTACTED", lastContactedAt: new Date() },
    });

    await logActivity({
      action: "PITCH_SENT",
      detail: `From: ${senderName} <${senderEmail}> → To: ${pitch.leadName} <${pitch.leadEmail}>`,
      userId: req.user!.id,
      leadId: pitch.leadId,
    });
    res.json(serializePitch(updated));
  }),
);

// ---- Delete a pitch ----
pitchesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.pitch.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);

// ---- Schedule a pitch using send-time optimization ----
pitchesRouter.post(
  "/:id/schedule",
  asyncHandler(async (req, res) => {
    const pitch = await prisma.pitch.findUnique({
      where: { id: param(req, "id") },
      include: { lead: true },
    });
    if (!pitch) throw notFound("Pitch not found");
    if (pitch.status !== "DRAFT") {
      return res.status(400).json({ error: "Only draft pitches can be scheduled.", code: "INVALID_STATUS" });
    }

    const recommendation = await recommendSendTime(pitch.leadId, req.user!.id);

    const now = new Date();
    const scheduled = new Date(now);
    const dayIndex = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(recommendation.recommendedDay);
    const diff = (dayIndex + 7 - now.getDay()) % 7 || 7;
    scheduled.setDate(now.getDate() + diff);
    scheduled.setHours(recommendation.recommendedHour, 0, 0, 0);
    if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 7);

    const updated = await prisma.pitch.update({
      where: { id: pitch.id },
      data: { scheduledSendAt: scheduled },
    });

    await prisma.sendTimeOptimization.create({
      data: {
        leadId: pitch.leadId,
        agentId: req.user!.id,
        recommendedHour: recommendation.recommendedHour,
        recommendedDay: recommendation.recommendedDay,
        confidence: recommendation.confidence,
        reason: recommendation.reason,
        lastUsedAt: new Date(),
      },
    });

    await logActivity({
      action: "PITCH_SCHEDULED",
      detail: `Scheduled for ${recommendation.recommendedDay} ${recommendation.recommendedHour}:00 (${recommendation.confidence}% confidence)`,
      userId: req.user!.id,
      leadId: pitch.leadId,
    });

    res.json(serializePitch(updated));
  }),
);
