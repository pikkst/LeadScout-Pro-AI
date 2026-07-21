// AI routes: proxy to Gemini for scouting/verification. Authenticated + rate-limited.
import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { logActivity } from "../utils/activity";
import { serializeLead } from "../utils/serializers";
import * as ai from "../services/ai.service";

export const aiRouter = Router();
aiRouter.use(requireAuth);

// AI calls are expensive — throttle per client.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please slow down.", code: "RATE_LIMITED" },
});
aiRouter.use(aiLimiter);

const leadInclude = {
  assignedAgent: true,
  createdBy: { select: { id: true, name: true } },
  followUpTask: true,
  meetings: { orderBy: { date: "asc" as const } },
  customFieldValues: { include: { field: true } },
};

aiRouter.post(
  "/cities",
  validate({ body: z.object({ location: z.string().min(1), focus: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const { location, focus } = req.body;
    res.json(await ai.findMajorCities(location, focus));
  }),
);

aiRouter.post(
  "/verify",
  validate({
    body: z.object({ email: z.string().min(1), companyName: z.string().min(1), website: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const { email, companyName, website } = req.body;
    const result = await ai.verifyEmail(email, companyName, website);
    res.json(result);
  }),
);

aiRouter.post(
  "/leads",
  validate({
    body: z.object({ city: z.string().min(1), country: z.string().min(1), focus: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const { city, country, focus } = req.body;
    const raw = await ai.findLeads(city, country, focus);
    const withIds = raw.map((lead, index) => ({
      ...lead,
      id: `lead-${city}-${Date.now()}-${index}`,
    }));
    res.json(withIds);
  }),
);

aiRouter.post(
  "/pitch",
  validate({
    body: z.object({
      lead: z.object({
        name: z.string(),
        category: z.string(),
        website: z.string(),
        description: z.string().optional().default(""),
      }),
      focus: z.string().min(1),
      preferredLanguage: z.string().default("Auto-Detect"),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { lead, focus, preferredLanguage } = req.body;
    const pitch = await ai.generatePitch(lead, focus, preferredLanguage);
    res.json(pitch);
  }),
);

aiRouter.post(
  "/score/:leadId",
  validate({
    body: z.object({ leadId: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const leadId = req.params.leadId;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const scoreResult = await ai.calculateLeadScore({
      name: lead.name,
      category: lead.category,
      website: lead.website,
      description: lead.description,
      estimatedValue: lead.estimatedValue,
      isVerified: lead.isVerified,
      stage: lead.stage,
    });

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiScore: scoreResult.score,
        aiScoreReason: scoreResult.reason,
      },
      include: leadInclude,
    });

    await logActivity({ action: "AI_SCORE_CALCULATED", detail: `Score: ${scoreResult.score}`, userId: req.user!.id, leadId });
    res.json(serializeLead(updated));
  }),
);

aiRouter.post(
  "/enrich/:leadId",
  validate({
    body: z.object({ leadId: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const leadId = req.params.leadId;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const enrichment = await ai.enrichLead({
      name: lead.name,
      category: lead.category,
      website: lead.website,
      description: lead.description,
    });

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        enrichmentData: JSON.stringify(enrichment),
      },
      include: leadInclude,
    });

    await logActivity({ action: "AI_ENRICHED", detail: `Enriched ${lead.name}`, userId: req.user!.id, leadId });
    res.json(serializeLead(updated));
  }),
);

aiRouter.post(
  "/predict/:leadId",
  validate({
    body: z.object({ leadId: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const leadId = req.params.leadId;
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { followUpTask: true, pitches: true },
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const prediction = await ai.predictStageTransition({
      name: lead.name,
      category: lead.category,
      stage: lead.stage,
      estimatedValue: lead.estimatedValue,
      isVerified: lead.isVerified,
      lastContactedAt: lead.lastContactedAt?.toISOString(),
      followUpTask: lead.followUpTask ? { isCompleted: lead.followUpTask.isCompleted } : undefined,
      pitches: lead.pitches.map(p => ({ status: p.status })),
    });

    await logActivity({ action: "AI_PREDICTION", detail: `Predicted ${prediction.predictedStage} (${prediction.probability}%)`, userId: req.user!.id, leadId });
    res.json(prediction);
  }),
);

aiRouter.post(
  "/meeting-prep/:meetingId",
  validate({
    body: z.object({ meetingId: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const meetingId = req.params.meetingId;
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { lead: true },
    });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    let enrichmentData: any = undefined;
    if (meeting.lead.enrichmentData) {
      try {
        enrichmentData = JSON.parse(meeting.lead.enrichmentData);
      } catch {
        enrichmentData = undefined;
      }
    }

    const prep = await ai.generateMeetingPrep({
      title: meeting.title,
      type: meeting.type,
      agenda: meeting.agenda,
      lead: {
        name: meeting.lead.name,
        category: meeting.lead.category,
        website: meeting.lead.website,
        description: meeting.lead.description,
        stage: meeting.lead.stage,
        estimatedValue: meeting.lead.estimatedValue,
        enrichmentData,
      },
    });

    await logActivity({ action: "AI_MEETING_PREP", detail: `Prepared for ${meeting.title}`, userId: req.user!.id, leadId: meeting.leadId });
    res.json(prep);
  }),
);
