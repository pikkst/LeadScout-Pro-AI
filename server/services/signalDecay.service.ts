// Signal freshness decay service: decay signal confidence and relevance over time.
import { prisma } from "../db";

const BATCH_SIZE = 50;

export async function decayAccountSignals() {
  const accountSignals = await prisma.accountSignal.findMany({
    where: { decayedAt: null },
    include: { signal: true },
  });

  const now = new Date();
  const zeroRelevanceIds: string[] = [];
  const updates: Array<{ id: string; relevance: number }> = [];

  for (const accountSignal of accountSignals) {
    const daysSinceCreated = Math.floor((now.getTime() - accountSignal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const decayFactor = Math.exp(-accountSignal.decayRate * daysSinceCreated);
    const newRelevance = Math.max(0, accountSignal.relevance * decayFactor);

    if (newRelevance < 0.05) {
      zeroRelevanceIds.push(accountSignal.id);
    } else if (Math.abs(newRelevance - accountSignal.relevance) > 0.001) {
      updates.push({ id: accountSignal.id, relevance: newRelevance });
    }
  }

  await prisma.$transaction([
    ...(zeroRelevanceIds.length > 0
      ? [
          prisma.accountSignal.updateMany({
            where: { id: { in: zeroRelevanceIds } },
            data: { relevance: 0, decayedAt: now },
          }),
        ]
      : []),
    ...(updates.length > 0
      ? [
          prisma.$transaction(
            updates.map((u) =>
              prisma.accountSignal.update({
                where: { id: u.id },
                data: { relevance: u.relevance },
              })
            )
          ),
        ]
      : []),
  ]);

  return zeroRelevanceIds.length;
}

export async function decayAccountRanks() {
  const ranks = await prisma.accountRank.findMany({
    where: { isDecayed: false },
  });

  const now = new Date();
  const updates: Array<{ id: string; decayedScore: number; isDecayed: boolean }> = [];

  for (const rank of ranks) {
    const hoursSinceCalculated = Math.floor((now.getTime() - rank.calculatedAt.getTime()) / (1000 * 60 * 60));
    const decayFactor = Math.max(0.5, 1 - hoursSinceCalculated * 0.01);
    const decayedScore = Math.round(rank.compositeScore * decayFactor);

    if (decayedScore < rank.compositeScore) {
      updates.push({
        id: rank.id,
        decayedScore,
        isDecayed: true,
      });
    }
  }

  if (updates.length > 0) {
    const batches: Array<Promise<unknown>> = [];
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      batches.push(prisma.$transaction(
        batch.map((u) =>
          prisma.accountRank.update({
            where: { id: u.id },
            data: {
              decayedCompositeScore: u.decayedScore,
              isDecayed: u.isDecayed,
              lastDecayedAt: now,
            },
          })
        )
      ));
    }
    await Promise.all(batches);
  }

  return updates.length;
}
