// Dashboard/analytics routes for the CRM stats view. Authenticated.
import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { stageFromDb } from "../utils/serializers";

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
