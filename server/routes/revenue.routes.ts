// Revenue & Commission tracking routes
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { param } from "../utils/param";

export const revenueRouter = Router();
revenueRouter.use(requireAuth);

const dealSchema = z.object({
  leadId: z.string(),
  value: z.coerce.number().int().min(1),
  commissionRate: z.coerce.number().min(0).max(100).default(10.0),
  agentId: z.string(),
  notes: z.string().default(""),
});

// ---- List deals ----
revenueRouter.get("/deals", asyncHandler(async (req, res) => {
  const { agentId, startDate, endDate } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};

  if (agentId) where.agentId = agentId;
  if (startDate || endDate) {
    where.closedAt = {};
    if (startDate) (where.closedAt as Record<string, string>).gte = startDate;
    if (endDate) (where.closedAt as Record<string, string>).lte = endDate;
  }

  const deals = await prisma.deal.findMany({
    where,
    include: {
      lead: { select: { id: true, name: true, stage: true } },
      agent: { select: { id: true, name: true } },
      commissions: true,
    },
    orderBy: { closedAt: "desc" },
  });

  res.json(deals);
}));

// ---- Create deal ----
revenueRouter.post("/deals", asyncHandler(async (req, res) => {
  const data = dealSchema.parse(req.body);
  const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
  if (!lead) throw notFound("Lead not found");

  const agent = await prisma.user.findUnique({ where: { id: data.agentId } });
  if (!agent) throw notFound("Agent not found");

  const commission = Math.round(data.value * (data.commissionRate / 100));

  const deal = await prisma.deal.create({
    data: {
      leadId: data.leadId,
      value: data.value,
      commissionRate: data.commissionRate,
      commission,
      agentId: data.agentId,
      notes: data.notes,
    },
    include: {
      lead: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
    },
  });

  // Create commission record
  await prisma.commission.create({
    data: {
      dealId: deal.id,
      agentId: data.agentId,
      amount: commission,
      status: "PENDING",
    },
  });

  res.json(deal);
}));

// ---- Revenue stats ----
revenueRouter.get("/stats", asyncHandler(async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [totalDealsCount, monthDealsCount, yearDealsCount, totalAgg, monthAgg, yearAgg] =
    await Promise.all([
      prisma.deal.count(),
      prisma.deal.count({ where: { closedAt: { gte: monthStart } } }),
      prisma.deal.count({ where: { closedAt: { gte: yearStart } } }),
      prisma.deal.aggregate({ _sum: { value: true, commission: true } }),
      prisma.deal.aggregate({
        where: { closedAt: { gte: monthStart } },
        _sum: { value: true, commission: true },
      }),
      prisma.deal.aggregate({
        where: { closedAt: { gte: yearStart } },
        _sum: { value: true, commission: true },
      }),
    ]);

  res.json({
    totalDeals: totalDealsCount,
    monthDeals: monthDealsCount,
    yearDeals: yearDealsCount,
    totalRevenue: totalAgg._sum.value || 0,
    monthRevenue: monthAgg._sum.value || 0,
    yearRevenue: yearAgg._sum.value || 0,
    totalCommission: totalAgg._sum.commission || 0,
    monthCommission: monthAgg._sum.commission || 0,
    yearCommission: yearAgg._sum.commission || 0,
  });
}));

// ---- Agent leaderboard ----
revenueRouter.get("/leaderboard", asyncHandler(async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    include: {
      deals: {
        include: {
          commissions: true,
        },
      },
    },
  });

  const leaderboard = agents.map((agent) => {
    const deals = agent.deals;
    const totalRevenue = deals.reduce((sum, d) => sum + d.value, 0);
    const totalCommission = deals.reduce((sum, d) => sum + d.commission, 0);
    return {
      id: agent.id,
      name: agent.name,
      deals: deals.length,
      revenue: totalRevenue,
      commission: totalCommission,
    };
  });

  leaderboard.sort((a, b) => b.revenue - a.revenue);
  res.json(leaderboard);
}));

// ---- Commissions list ----
revenueRouter.get("/commissions", asyncHandler(async (req, res) => {
  const { status, agentId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (agentId) where.agentId = agentId;

  const commissions = await prisma.commission.findMany({
    where,
    include: {
      deal: { include: { lead: { select: { name: true } } } },
      agent: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(commissions);
}));

// ---- Mark commission as paid ----
revenueRouter.put("/commissions/:id/pay", asyncHandler(async (req, res) => {
  const commission = await prisma.commission.update({
    where: { id: param(req, "id") },
    data: { status: "PAID", paidAt: new Date() },
    include: {
      deal: { include: { lead: { select: { name: true } } } },
      agent: { select: { name: true } },
    },
  });

  res.json(commission);
}));
