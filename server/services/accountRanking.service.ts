// Account ranking service: compute fit × timing × relationship × value scores.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";
import * as ai from "./ai.service";

export interface RankPayload {
  id: string;
  accountId: string;
  fitScore: number;
  timingScore: number;
  relationshipScore: number;
  valueScore: number;
  compositeScore: number;
  explanation: string;
  evidence: unknown;
  calculatedAt: string;
  isDecayed: boolean;
  decayedCompositeScore: number;
}

export async function calculateAccountRank(accountId: string): Promise<RankPayload> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      contacts: true,
      opportunities: { where: { status: "OPEN" } },
      relationships: true,
      timelineEntries: { orderBy: { occurredAt: "desc" }, take: 20 },
      signals: { include: { signal: true } },
    },
  });

  if (!account) throw new HttpError(404, "Account not found", "NOT_FOUND");

  const signals = account.signals.map((s) => ({
    type: s.signal.type,
    confidence: s.signal.confidence,
    relevance: s.relevance,
    freshness: s.freshness,
    context: s.context,
  }));

  const now = new Date();
  const lastInteraction = account.timelineEntries[0]?.occurredAt;
  const daysSinceInteraction = lastInteraction
    ? Math.max(0, Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24)))
    : 30;

  const relationshipStrength = account.relationships.reduce((sum, r) => sum + r.strength, 0);
  const relationshipScore = Math.min(100, Math.max(0, relationshipStrength + (30 - daysSinceInteraction)));

  const opportunityValue = account.opportunities.reduce((sum, o) => sum + o.value, 0);
  const valueScore = Math.min(100, Math.max(0, Math.round(opportunityValue / 1000)));

  const contactCount = account.contacts.length;
  const fitScore = Math.min(100, Math.max(0, contactCount * 15 + signals.filter((s) => s.type === "INTENT").length * 10));

  const timingSignals = signals.filter((s) => s.freshness <= 7);
  const timingScore = Math.min(100, Math.max(0, timingSignals.length * 20));

  const compositeScore = Math.min(100, Math.round(fitScore * 0.35 + timingScore * 0.25 + relationshipScore * 0.25 + valueScore * 0.15));

  const evidence = signals.slice(0, 5).map((s) => ({
    type: s.type,
    confidence: s.confidence,
    relevance: s.relevance,
    context: s.context,
    snippet: s.context?.slice(0, 200) ?? "",
  }));

  const explanation = `
    Fit score ${fitScore} is based on ${contactCount} contacts and ${signals.filter((s) => s.type === "INTENT").length} intent signals.
    Timing score ${timingScore} reflects ${timingSignals.length} fresh signals in the last 7 days.
    Relationship score ${relationshipScore} reflects a relationship strength of ${relationshipStrength} and last interaction ${daysSinceInteraction} days ago.
    Value score ${valueScore} is based on EUR ${opportunityValue} in open opportunities.
    Composite rank ${compositeScore} weighs fit (35%), timing (25%), relationship (25%), and value (15%).
  `.trim();

  const rank = await prisma.accountRank.upsert({
    where: { accountId },
    update: {
      fitScore,
      timingScore,
      relationshipScore,
      valueScore,
      compositeScore,
      explanation,
      evidence: JSON.stringify(evidence),
      calculatedAt: new Date(),
    },
    create: {
      accountId,
      fitScore,
      timingScore,
      relationshipScore,
      valueScore,
      compositeScore,
      explanation,
      evidence: JSON.stringify(evidence),
    },
  });

  return {
    id: rank.id,
    accountId: rank.accountId,
    fitScore: rank.fitScore,
    timingScore: rank.timingScore,
    relationshipScore: rank.relationshipScore,
    valueScore: rank.valueScore,
    compositeScore: rank.isDecayed ? rank.decayedCompositeScore : rank.compositeScore,
    explanation: rank.explanation,
    evidence: JSON.parse(rank.evidence || "[]"),
    calculatedAt: rank.calculatedAt.toISOString(),
    isDecayed: rank.isDecayed,
    decayedCompositeScore: rank.decayedCompositeScore,
  };
}

export async function getRankings(filters?: { limit?: number; minScore?: number }) {
  const where: Record<string, unknown> = {};
  if (filters?.minScore) {
    where.compositeScore = { gte: filters.minScore };
  }

  const ranks = await prisma.accountRank.findMany({
    where,
    orderBy: { compositeScore: "desc" },
    take: filters?.limit ?? 50,
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

  return ranks.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    account: r.account,
    fitScore: r.fitScore,
    timingScore: r.timingScore,
    relationshipScore: r.relationshipScore,
    valueScore: r.valueScore,
    compositeScore: r.isDecayed ? r.decayedCompositeScore : r.compositeScore,
    explanation: r.explanation,
    evidence: JSON.parse(r.evidence || "[]"),
    calculatedAt: r.calculatedAt.toISOString(),
    isDecayed: r.isDecayed,
    decayedCompositeScore: r.decayedCompositeScore,
  }));
}

export async function findMissingRanks() {
  const accountsWithoutRank = await prisma.account.findMany({
    where: {
      ranks: { none: {} },
    },
    select: { id: true },
  });

  return accountsWithoutRank.map((a) => a.id);
}
