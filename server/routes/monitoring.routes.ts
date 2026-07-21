// Lead monitoring routes: alerts and competitor insights.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";
import * as ai from "../services/ai.service";
import { logActivity } from "../utils/activity";

export const monitoringRouter = Router();
monitoringRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

monitoringRouter.get("/lead/:leadId", asyncHandler(async (req, res) => {
  const alerts = await prisma.leadMonitoring.findMany({
    where: { leadId: param(req, "leadId") },
    orderBy: { createdAt: "desc" },
  });
  res.json(alerts);
}));

monitoringRouter.post("/lead/:leadId/check", canWrite, validate({
  body: z.object({ leadId: z.string().min(1) }),
}), asyncHandler(async (req, res) => {
  const leadId = param(req, "leadId");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw notFound("Lead not found");

  const insights = await ai.generateCompetitorInsights({
    name: lead.name,
    category: lead.category,
    website: lead.website,
    description: lead.description,
    enrichmentData: lead.enrichmentData ? JSON.parse(lead.enrichmentData) : undefined,
  });

  const alerts = [];
  for (const insight of insights) {
    const alert = await prisma.leadMonitoring.create({
      data: {
        leadId,
        type: "COMPETITOR",
        title: `Competitor alert: ${insight.competitor}`,
        description: `${insight.recommendation} Threat level: ${insight.threatLevel}`,
        source: "AI Generated",
      },
    });
    alerts.push(alert);
  }

  await logActivity({ action: "MONITORING_CHECK", detail: `Checked competitors for ${lead.name}`, userId: req.user!.id, leadId });
  res.json(alerts);
}));

monitoringRouter.patch("/:id/read", asyncHandler(async (req, res) => {
  const alert = await prisma.leadMonitoring.update({
    where: { id: param(req, "id") },
    data: { isRead: true },
  });
  res.json(alert);
}));
