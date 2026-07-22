// Dashboard/analytics routes for the CRM stats view. Authenticated.
import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { stageFromDb } from "../utils/serializers";
import * as ai from "../services/ai.service";
import { expensiveOperationLimiter } from "../middleware/expensiveRateLimit";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [leads, pitches, byStageRaw, byFocusRaw, pipelineValue] = await Promise.all([
      prisma.lead.count(),
      prisma.pitch.count(),
      prisma.lead.groupBy({ by: ["stage"], _count: { _all: true } }),
      prisma.lead.groupBy({ by: ["focus"], _count: { _all: true } }),
      prisma.lead.aggregate({ _sum: { estimatedValue: true } }),
    ]);

    const byStage: Record<string, number> = {};
    for (const row of byStageRaw) byStage[stageFromDb(row.stage)] = row._count._all;

    const byFocus: Record<string, number> = {};
    for (const row of byFocusRaw) byFocus[row.focus ?? "unspecified"] = row._count._all;

    const sentPitches = await prisma.pitch.count({ where: { status: { in: ["SENT", "DELIVERED", "REPLIED"] } } });
    const repliedPitches = await prisma.pitch.count({ where: { status: "REPLIED" } });

    res.json({
      totalLeads: leads,
      totalPitches: pitches,
      sentPitches,
      repliedPitches,
      pipelineValueEUR: pipelineValue._sum.estimatedValue ?? 0,
      byStage,
      byFocus,
    });
  }),
);

// Recent activity feed for the team.
statsRouter.get(
  "/activity",
  asyncHandler(async (_req, res) => {
    const activities = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true } }, lead: { select: { name: true } } },
    });
    res.json(
      activities.map((a) => ({
        id: a.id,
        action: a.action,
        detail: a.detail,
        user: a.user?.name ?? "System",
        lead: a.lead?.name ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    );
  }),
);

// Pipeline forecast based on historical conversion rates
statsRouter.get(
  "/forecast",
  asyncHandler(async (_req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [stageCounts, recentDeals] = await Promise.all([
      prisma.lead.groupBy({ by: ["stage"], _count: { _all: true }, _sum: { estimatedValue: true } }),
      prisma.deal.findMany({
        where: { closedAt: { gte: thirtyDaysAgo } },
        select: { value: true, commissionRate: true },
      }),
    ]);

    const stageMap: Record<string, { count: number; value: number }> = {};
    for (const row of stageCounts) {
      stageMap[stageFromDb(row.stage)] = { count: row._count._all, value: row._sum.estimatedValue ?? 0 };
    }

    const totalLeads = Object.values(stageMap).reduce((sum, s) => sum + s.count, 0);
    const totalValue = Object.values(stageMap).reduce((sum, s) => sum + s.value, 0);

    // Historical conversion rates (simplified model)
    const conversionRates: Record<string, number> = {
      DISCOVERED: 0.15,
      CONTACTED: 0.30,
      NEGOTIATION: 0.60,
      SIGNED: 0.90,
      ACTIVE: 1.0,
      ARCHIVED: 0,
    };

    // Forecast next 30 days
    let forecastedValue = 0;
    let forecastedDeals = 0;

    for (const [stage, data] of Object.entries(stageMap)) {
      const rate = conversionRates[stage] || 0;
      forecastedDeals += Math.round(data.count * rate);
      forecastedValue += Math.round(data.value * rate);
    }

    // Recent performance
    const recentDealCount = recentDeals.length;
    const recentRevenue = recentDeals.reduce((sum, d) => sum + d.value, 0);
    const avgDealSize = recentDealCount > 0 ? Math.round(recentRevenue / recentDealCount) : 0;

    res.json({
      current: {
        totalLeads,
        totalValue,
        byStage: stageMap,
      },
      forecast: {
        next30Days: {
          estimatedDeals: forecastedDeals,
          estimatedValue: forecastedValue,
        },
      },
      performance: {
        recentDeals: recentDealCount,
        recentRevenue,
        avgDealSize,
        avgCommissionRate: recentDealCount > 0
          ? Math.round(recentDeals.reduce((sum, d) => sum + d.commissionRate, 0) / recentDealCount * 100) / 100
          : 0,
      },
    });
  }),
);

// Conversion metrics by segment
statsRouter.get(
  "/conversion",
  asyncHandler(async (_req, res) => {
    const segments = await prisma.lead.groupBy({
      by: ["focus", "stage"],
      _count: { _all: true },
    });

    const bySegment: Record<string, Record<string, number>> = {};
    for (const row of segments) {
      const segment = row.focus || "unspecified";
      const stage = stageFromDb(row.stage);
      if (!bySegment[segment]) bySegment[segment] = {};
      bySegment[segment][stage] = row._count._all;
    }

    // Calculate conversion rates per segment
    const conversionData = Object.entries(bySegment).map(([segment, stages]) => {
      const total = Object.values(stages).reduce((a, b) => a + b, 0);
      const signed = stages.SIGNED || 0;
      const active = stages.ACTIVE || 0;
      const conversionRate = total > 0 ? ((signed + active) / total) * 100 : 0;

      return {
        segment,
        total,
        signed,
        active,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    });

    conversionData.sort((a, b) => b.conversionRate - a.conversionRate);

    res.json(conversionData);
  }),
);

// Agent performance analytics
statsRouter.get(
  "/agent-performance",
  asyncHandler(async (_req, res) => {
    const agents = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      include: {
        assignedLeads: {
          select: { id: true, stage: true, estimatedValue: true },
        },
        deals: {
          select: { value: true, commission: true, closedAt: true },
        },
      },
    });

    const performance = agents.map((agent) => {
      const leads = agent.assignedLeads;
      const deals = agent.deals;

      const byStage: Record<string, number> = {};
      for (const lead of leads) {
        const stage = stageFromDb(lead.stage);
        byStage[stage] = (byStage[stage] || 0) + 1;
      }

      const totalDealValue = deals.reduce((sum, d) => sum + d.value, 0);
      const totalCommission = deals.reduce((sum, d) => sum + d.commission, 0);

      return {
        id: agent.id,
        name: agent.name,
        totalLeads: leads.length,
        byStage,
        deals: deals.length,
        totalDealValue,
        totalCommission,
      };
    });

    res.json(performance);
  }),
);

// AI-enhanced revenue forecast
statsRouter.get(
  "/forecast/ai",
  expensiveOperationLimiter,
  asyncHandler(async (_req, res) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [leads, recentDeals] = await Promise.all([
      prisma.lead.findMany({
        select: { stage: true, estimatedValue: true, aiScore: true },
      }),
      prisma.deal.findMany({
        where: { closedAt: { gte: ninetyDaysAgo } },
        select: { value: true, closedAt: true },
      }),
    ]);

    const forecast = await ai.generateAiForecast(
      leads.map(l => ({
        stage: l.stage,
        estimatedValue: l.estimatedValue,
        aiScore: l.aiScore ?? undefined,
      })),
      recentDeals.map(d => ({ value: d.value, closedAt: d.closedAt.toISOString() })),
    );

    res.json(forecast);
  }),
);
