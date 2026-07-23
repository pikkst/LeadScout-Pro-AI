// Signal freshness decay service: decay signal confidence and relevance over time.
import { prisma } from "../db";

export async function decayAccountSignals() {
  const accountSignals = await prisma.accountSignal.findMany({
    where: { decayedAt: null },
    include: { signal: true },
  });

  let decayedCount = 0;
  for (const accountSignal of accountSignals) {
    const daysSinceCreated = Math.floor((Date.now() - accountSignal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const decayFactor = Math.exp(-accountSignal.decayRate * daysSinceCreated);
    const newRelevance = Math.max(0, accountSignal.relevance * decayFactor);

    if (newRelevance < 0.05) {
      await prisma.accountSignal.update({
        where: { id: accountSignal.id },
        data: { relevance: 0, decayedAt: new Date() },
      });
      decayedCount++;
    } else if (newRelevance !== accountSignal.relevance) {
      await prisma.accountSignal.update({
        where: { id: accountSignal.id },
        data: { relevance: newRelevance },
      });
    }
  }

  return decayedCount;
}

export async function decayAccountRanks() {
  const ranks = await prisma.accountRank.findMany({
    where: { isDecayed: false },
  });

  for (const rank of ranks) {
    const hoursSinceCalculated = Math.floor((Date.now() - rank.calculatedAt.getTime()) / (1000 * 60 * 60));
    const decayFactor = Math.max(0.5, 1 - hoursSinceCalculated * 0.01);
    const decayedScore = Math.round(rank.compositeScore * decayFactor);

    await prisma.accountRank.update({
      where: { id: rank.id },
      data: {
        decayedCompositeScore: decayedScore,
        isDecayed: decayedScore < rank.compositeScore,
        lastDecayedAt: new Date(),
      },
    });
  }

  return ranks.length;
}
