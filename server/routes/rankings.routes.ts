// Rankings routes: account ranking by fit × timing × relationship × value.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";
import { calculateAccountRank, getRankings } from "../services/accountRanking.service";

export const rankingsRouter = Router();
rankingsRouter.use(requireAuth);

rankingsRouter.get("/", asyncHandler(async (req, res) => {
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
  const minScore = typeof req.query.minScore === "string" ? parseInt(req.query.minScore, 10) : undefined;

  const data = await getRankings({ limit, minScore });
  res.json(data);
}));

rankingsRouter.post("/accounts/:accountId/recalculate", asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw notFound("Account not found");

  const rank = await calculateAccountRank(accountId);
  res.status(201).json(rank);
}));

rankingsRouter.get("/accounts/:accountId", asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");

  const rank = await prisma.accountRank.findUnique({
    where: { accountId },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          domain: true,
          industry: true,
          contacts: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  if (!rank) throw notFound("Rank not found");

  res.json({
    id: rank.id,
    accountId: rank.accountId,
    account: rank.account,
    fitScore: rank.fitScore,
    timingScore: rank.timingScore,
    relationshipScore: rank.relationshipScore,
    valueScore: rank.valueScore,
    compositeScore: rank.compositeScore,
    explanation: rank.explanation,
    evidence: JSON.parse(rank.evidence || "[]"),
    calculatedAt: rank.calculatedAt.toISOString(),
  });
}));
