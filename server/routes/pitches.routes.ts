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
import { logActivity } from "../utils/activity";
import { param } from "../utils/param";

export const pitchesRouter = Router();
pitchesRouter.use(requireAuth);

// ---- List all pitches ----
pitchesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const pitches = await prisma.pitch.findMany({ orderBy: { createdAt: "desc" } });
    res.json(pitches.map(serializePitch));
  }),
);

// ---- Generate + persist a pitch for a stored lead ----
const generateSchema = z.object({
  leadId: z.string(),
  focus: z.string(),
  preferredLanguage: z.string().default("Auto-Detect"),
});

pitchesRouter.post(
  "/generate",
  validate({ body: generateSchema }),
  asyncHandler(async (req, res) => {
    const { leadId, focus, preferredLanguage } = req.body as z.infer<typeof generateSchema>;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw notFound("Lead not found");

    const generated = await generatePitch(
      { name: lead.name, category: lead.category, website: lead.website, description: lead.description },
      focus,
      preferredLanguage,
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

    try {
      await sendPitchEmail({
        to: pitch.leadEmail,
        subject: pitch.subject,
        html: pitch.htmlContent,
        text: pitch.textContent,
        replyTo: req.user!.email,
      });
    } catch (err) {
      await prisma.pitch.update({ where: { id: pitch.id }, data: { status: "FAILED" } });
      throw err;
    }

    const updated = await prisma.pitch.update({
      where: { id: pitch.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    // Advance the lead to "Contacted" when it is still early-stage.
    await prisma.lead.updateMany({
      where: { id: pitch.leadId, stage: "DISCOVERED" },
      data: { stage: "CONTACTED", lastContactedAt: new Date() },
    });
    await logActivity({
      action: "PITCH_SENT",
      detail: `${pitch.leadName} <${pitch.leadEmail}>`,
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
