// Signal ingestion service: ingest, verify, and manage revenue signals.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";

export interface SignalInput {
  type: "HIRING" | "FUNDING" | "LEADERSHIP_CHANGE" | "TECHNOLOGY" | "INTENT" | "PRODUCT_USAGE" | "RENEWAL" | "RELATIONSHIP_ACTIVITY";
  source: string;
  evidence: string;
  confidence: number;
  rawPayload?: unknown;
  accountIds?: string[];
}

export interface AccountSignalInput {
  relevance: number;
  freshness: number;
  context?: string;
}

export interface SignalPayload {
  id: string;
  type: string;
  source: string;
  evidence: string;
  confidence: number;
  isVerified: boolean;
  ingestedAt: string;
  verifiedAt?: string;
  accountSignals?: Array<{ accountId: string; relevance: number; freshness: number; context?: string }>;
}

export async function ingestSignal(
  input: SignalInput,
): Promise<SignalPayload> {
  const data: Parameters<typeof prisma.signal.create>[0]['data'] = {
    type: input.type,
    source: input.source,
    evidence: input.evidence,
    confidence: Math.min(1, Math.max(0, input.confidence)),
    isVerified: false,
  };
  if (input.rawPayload) data.rawPayload = input.rawPayload as any;

  const signal = await prisma.signal.create({
    data,
  });

  if (input.accountIds && input.accountIds.length > 0) {
    await prisma.accountSignal.createMany({
      data: input.accountIds.map((accountId) => ({
        accountId,
        signalId: signal.id,
        relevance: Math.min(1, Math.max(0, input.confidence)),
        freshness: 0,
      })),
    });
  }

  return {
    id: signal.id,
    type: signal.type,
    source: signal.source,
    evidence: signal.evidence,
    confidence: signal.confidence,
    isVerified: signal.isVerified,
    ingestedAt: signal.ingestedAt.toISOString(),
    verifiedAt: signal.verifiedAt?.toISOString() ?? undefined,
  };
}

export async function getSignals(filters?: { accountId?: string; type?: string; isVerified?: boolean; limit?: number }) {
  const where: Record<string, unknown> = {};

  if (filters?.type) {
    where.type = filters.type;
  }
  if (filters?.isVerified !== undefined) {
    where.isVerified = filters.isVerified;
  }
  if (filters?.accountId) {
    const accountSignals = await prisma.accountSignal.findMany({
      where: { accountId: filters.accountId },
      select: { signalId: true },
      distinct: ["signalId"],
    });
    where.id = { in: accountSignals.map((s) => s.signalId) };
  }

  const signals = await prisma.signal.findMany({
    where,
    orderBy: { ingestedAt: "desc" },
    take: filters?.limit ?? 50,
    include: {
      accountSignals: filters?.accountId
        ? { where: { accountId: filters.accountId } }
        : false,
    },
  });

  return signals.map((s) => ({
    id: s.id,
    type: s.type,
    source: s.source,
    evidence: s.evidence,
    confidence: s.confidence,
    isVerified: s.isVerified,
    ingestedAt: s.ingestedAt.toISOString(),
    verifiedAt: s.verifiedAt?.toISOString() ?? undefined,
    accountSignals: s.accountSignals?.length
      ? s.accountSignals.map((a) => ({
          accountId: a.accountId,
          relevance: a.relevance,
          freshness: a.freshness,
          context: a.context ?? undefined,
        }))
      : undefined,
  }));
}

export async function verifySignal(signalId: string, verified: boolean) {
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new HttpError(404, "Signal not found", "NOT_FOUND");

  const updated = await prisma.signal.update({
    where: { id: signalId },
    data: { isVerified: verified, verifiedAt: new Date() },
  });

  return {
    id: updated.id,
    type: updated.type,
    source: updated.source,
    evidence: updated.evidence,
    confidence: updated.confidence,
    isVerified: updated.isVerified,
    ingestedAt: updated.ingestedAt.toISOString(),
    verifiedAt: updated.verifiedAt?.toISOString() ?? undefined,
  };
}

export async function deleteSignal(signalId: string) {
  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) throw new HttpError(404, "Signal not found", "NOT_FOUND");

  await prisma.accountSignal.deleteMany({ where: { signalId } });
  await prisma.signal.delete({ where: { id: signalId } });

  return { ok: true };
}
