// Send-time optimization and agent coaching routes.
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

export const optimizationRouter = Router();
optimizationRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

// ---- Send-time optimization ----
optimizationRouter.post("/send-time/:leadId", validate({
  body: z.object({ leadId: z.string().min(1), agentId: z.string().optional().nullable() }),
}), asyncHandler(async (req, res) => {
  const leadId = param(req, "leadId");
  const agentId = req.body.agentId || req.user!.id;

  const recommendation = await ai.recommendSendTime(leadId, agentId);

  const record = await prisma.sendTimeOptimization.create({
    data: {
      leadId,
      agentId: agentId || undefined,
      recommendedHour: recommendation.recommendedHour,
      recommendedDay: recommendation.recommendedDay,
      confidence: recommendation.confidence,
      reason: recommendation.reason,
      lastUsedAt: new Date(),
    },
  });

  await logActivity({ action: "SEND_TIME_OPTIMIZED", detail: `${recommendation.recommendedDay} ${recommendation.recommendedHour}:00`, userId: req.user!.id, leadId });
  res.json(record);
}));

optimizationRouter.get("/send-time/:leadId", asyncHandler(async (req, res) => {
  const records = await prisma.sendTimeOptimization.findMany({
    where: { leadId: param(req, "leadId") },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  res.json(records);
}));

// ---- Agent coaching ----
optimizationRouter.get("/coaching/me", asyncHandler(async (req, res) => {
  const agentId = req.user!.id;
  const insights = await prisma.agentCoaching.findMany({
    where: { agentId, isResolved: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(insights);
}));

optimizationRouter.post("/coaching/generate", asyncHandler(async (req, res) => {
  const agentId = req.user!.id;
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent) throw notFound("Agent not found");

  const [assignedLeads, deals, activities] = await Promise.all([
    prisma.lead.findMany({ where: { assignedAgentId: agentId }, select: { stage: true, estimatedValue: true } }),
    prisma.deal.findMany({ where: { agentId }, select: { value: true, commission: true, commissionRate: true, closedAt: true } }),
    prisma.activityLog.findMany({ where: { userId: agentId }, orderBy: { createdAt: "desc" }, take: 20, select: { action: true, detail: true, createdAt: true } }),
  ]);

  const byStage: Record<string, number> = {};
  assignedLeads.forEach(l => { byStage[l.stage] = (byStage[l.stage] || 0) + 1; });
  const totalDealValue = deals.reduce((sum, d) => sum + d.value, 0);
  const totalCommission = deals.reduce((sum, d) => sum + d.commission, 0);
  const avgDealSize = deals.length > 0 ? Math.round(totalDealValue / deals.length) : 0;
  const conversionRate = assignedLeads.length > 0 ? Math.round((deals.length / assignedLeads.length) * 100) : 0;

  const insights = await ai.generateAgentCoaching(agentId, agent.name, {
    totalLeads: assignedLeads.length,
    byStage,
    deals: deals.length,
    totalDealValue,
    totalCommission,
    avgDealSize,
    conversionRate,
    recentActivities: activities.map(a => ({ action: a.action, detail: a.detail, createdAt: a.createdAt.toISOString() })),
  });

  const created = [];
  for (const insight of insights) {
    const record = await prisma.agentCoaching.create({
      data: {
        agentId,
        insightType: insight.insightType,
        title: insight.title,
        description: insight.description,
        priority: insight.priority,
      },
    });
    created.push(record);
  }

  await logActivity({ action: "COACHING_GENERATED", detail: `${insights.length} insights`, userId: agentId });
  res.json(created);
}));

optimizationRouter.patch("/coaching/:id/read", asyncHandler(async (req, res) => {
  const insight = await prisma.agentCoaching.update({
    where: { id: param(req, "id") },
    data: { isRead: true },
  });
  res.json(insight);
}));

optimizationRouter.patch("/coaching/:id/resolve", asyncHandler(async (req, res) => {
  const insight = await prisma.agentCoaching.update({
    where: { id: param(req, "id") },
    data: { isResolved: true },
  });
  res.json(insight);
}));
