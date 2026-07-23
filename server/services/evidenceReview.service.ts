// Evidence review service: gate AI recommendations before approval into sequences, pitches, or tasks.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";
import type { JsonValue } from "@prisma/client/runtime/library";

export interface EvidenceReviewInput {
  entityType: string;
  entityId: string;
  recommendation: string;
  sources: unknown[];
  confidence: number;
  freshness?: number;
}

export interface EvidenceReviewPayload {
  id: string;
  entityType: string;
  entityId: string;
  recommendation: string;
  sources: unknown[];
  confidence: number;
  freshness: number;
  status: string;
  reviewedById?: string;
  reviewedByName?: string;
  comment: string;
  reviewedAt?: string;
  createdById: string;
  createdByName: string;
  decayedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createEvidenceReview(userId: string, input: EvidenceReviewInput): Promise<EvidenceReviewPayload> {
  const review = await prisma.evidenceReview.create({
    data: {
      entityType: input.entityType as any,
      entityId: input.entityId,
      recommendation: input.recommendation,
      sources: JSON.stringify(input.sources) as any,
      confidence: Math.min(1, Math.max(0, input.confidence)),
      freshness: input.freshness ?? 0,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } },
  });
  return serializeEvidenceReview(review);
}

export async function listEvidenceReviews(filters?: { entityType?: string; entityId?: string; status?: string; createdById?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.entityType) where.entityType = filters.entityType as any;
  if (filters?.entityId) where.entityId = filters.entityId;
  if (filters?.status) where.status = filters.status as any;
  if (filters?.createdById) where.createdById = filters.createdById;

  const reviews = await prisma.evidenceReview.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } },
  });
  return reviews.map(serializeEvidenceReview);
}

export async function approveEvidenceReview(reviewId: string, userId: string, comment = "") {
  const review = await prisma.evidenceReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new HttpError(404, "Evidence review not found", "NOT_FOUND");
  if (review.status !== "PENDING") throw new HttpError(400, "Review is not pending", "BAD_REQUEST");

  const updated = await prisma.evidenceReview.update({
    where: { id: reviewId },
    data: { status: "APPROVED", reviewedById: userId, comment, reviewedAt: new Date() },
    include: { createdBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } },
  });
  return serializeEvidenceReview(updated);
}

export async function rejectEvidenceReview(reviewId: string, userId: string, comment = "") {
  const review = await prisma.evidenceReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new HttpError(404, "Evidence review not found", "NOT_FOUND");
  if (review.status !== "PENDING") throw new HttpError(400, "Review is not pending", "BAD_REQUEST");

  const updated = await prisma.evidenceReview.update({
    where: { id: reviewId },
    data: { status: "REJECTED", reviewedById: userId, comment, reviewedAt: new Date() },
    include: { createdBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } },
  });
  return serializeEvidenceReview(updated);
}

export async function decayStaleEvidenceReviews(maxAgeHours = 72) {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const stale = await prisma.evidenceReview.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
  });
  for (const review of stale) {
    await prisma.evidenceReview.update({
      where: { id: review.id },
      data: { status: "DECAYED", decayedAt: new Date() },
    });
  }
  return stale.length;
}

function serializeEvidenceReview(review: {
  id: string;
  entityType: string;
  entityId: string;
  recommendation: string;
  sources: JsonValue;
  confidence: number;
  freshness: number;
  status: string;
  reviewedById?: string;
  reviewedBy?: { id: string; name: string } | null;
  comment: string;
  reviewedAt?: Date;
  createdById: string;
  createdBy: { id: string; name: string };
  decayedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}): EvidenceReviewPayload {
  return {
    id: review.id,
    entityType: review.entityType,
    entityId: review.entityId,
    recommendation: review.recommendation,
    sources: parseSources(review.sources),
    confidence: review.confidence,
    freshness: review.freshness,
    status: review.status,
    reviewedById: review.reviewedById,
    reviewedByName: review.reviewedBy?.name,
    comment: review.comment,
    reviewedAt: review.reviewedAt?.toISOString(),
    createdById: review.createdById,
    createdByName: review.createdBy.name,
    decayedAt: review.decayedAt?.toISOString(),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

function parseSources(value: JsonValue): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
