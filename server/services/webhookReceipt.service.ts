import { prisma } from "../db";

let nextCleanupAt = 0;

async function cleanupOldReceipts() {
  const now = Date.now();
  if (now < nextCleanupAt) return;
  nextCleanupAt = now + 60 * 60 * 1000;
  await prisma.webhookReceipt.deleteMany({
    where: { receivedAt: { lt: new Date(now - 90 * 24 * 60 * 60 * 1000) } },
  });
}

export async function claimWebhookEvent(provider: string, providerEventId: string): Promise<boolean> {
  try {
    await prisma.webhookReceipt.create({ data: { provider, providerEventId } });
    await cleanupOldReceipts().catch(() => undefined);
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return false;
    throw error;
  }
}
