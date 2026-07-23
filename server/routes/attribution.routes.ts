// Attribution routes: record and read playbook step/version attributions.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const attributionRouter = Router();
attributionRouter.use(requireAuth);

const attributionSchema = z.object({
  outcome: z.enum(["POSITIVE_REPLY", "QUALIFIED_MEETING", "STAGE_CHANGE", "WIN", "REVENUE"]),
  outcomeValue: z.number().int().optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
  accountId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  opportunityId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  pitchId: z.string().optional().nullable(),
  stepId: z.string().optional().nullable(),
});

type AttributionInput = z.infer<typeof attributionSchema>;

attributionRouter.post("/", asyncHandler(async (req, res) => {
  const body = req.body as AttributionInput;

  const version = await prisma.playbookVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!version) {
    return res.status(400).json({ error: "No active playbook version found" });
  }

  const attribution = await prisma.playbookAttribution.create({
    data: {
      outcome: body.outcome,
      outcomeValue: body.outcomeValue,
      metadata: JSON.stringify(body.metadata),
      accountId: body.accountId,
      contactId: body.contactId,
      opportunityId: body.opportunityId,
      leadId: body.leadId,
      pitchId: body.pitchId,
      stepId: body.stepId,
      versionId: version.id,
    },
  });

  res.status(201).json(attribution);
}));

attributionRouter.get("/playbook/:playbookId", asyncHandler(async (req, res) => {
  const playbook = await prisma.playbook.findUnique({ where: { id: param(req, "playbookId") } });
  if (!playbook) throw notFound("Playbook not found");

  const versions = await prisma.playbookVersion.findMany({
    where: { playbookId: playbook.id },
    select: { id: true },
  });
  const versionIds = versions.map((v) => v.id);

  const attributions = await prisma.playbookAttribution.findMany({
    where: { versionId: { in: versionIds } },
    orderBy: { attributedAt: "desc" },
    take: 200,
  });

  const summary = {
    total: attributions.length,
    byOutcome: attributions.reduce<Record<string, number>>((acc, a) => {
      acc[a.outcome] = (acc[a.outcome] || 0) + 1;
      return acc;
    }, {}),
    revenue: attributions.reduce((sum, a) => sum + (a.outcomeValue || 0), 0),
  };

  res.json({ attributions, summary });
}));

attributionRouter.get("/step/:stepId", asyncHandler(async (req, res) => {
  const stepId = param(req, "stepId");
  const step = await prisma.playbookStep.findUnique({ where: { id: stepId } });
  if (!step) throw notFound("Step not found");

  const attributions = await prisma.playbookAttribution.findMany({
    where: { stepId },
    orderBy: { attributedAt: "desc" },
  });

  const summary = {
    total: attributions.length,
    byOutcome: attributions.reduce<Record<string, number>>((acc, a) => {
      acc[a.outcome] = (acc[a.outcome] || 0) + 1;
      return acc;
    }, {}),
    revenue: attributions.reduce((sum, a) => sum + (a.outcomeValue || 0), 0),
  };

  res.json({ attributions, summary });
}));
