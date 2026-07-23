// Evidence review routes: gate AI recommendations before approval.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createEvidenceReview, listEvidenceReviews, approveEvidenceReview, rejectEvidenceReview, decayStaleEvidenceReviews } from "../services/evidenceReview.service";
import { recordAutomationAudit } from "../services/automationAudit.service";

export const evidenceRouter = Router();
evidenceRouter.use(requireAuth);

const createSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  recommendation: z.string(),
  sources: z.array(z.any()),
  confidence: z.coerce.number().min(0).max(1),
  freshness: z.coerce.number().int().nonnegative().optional(),
});

evidenceRouter.post("/", validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const review = await createEvidenceReview((req as any).user.id, (req as any).body);
  await recordAutomationAudit({
    actionType: "CRM_UPDATE",
    entityType: "EVIDENCE_REVIEW",
    entityId: review.id,
    actorType: "USER",
    actorId: (req as any).user.id,
    newState: { status: review.status },
  });
  res.status(201).json(review);
}));

evidenceRouter.get("/", asyncHandler(async (req, res) => {
  const { entityType, entityId, status, createdById } = (req as any).query as Record<string, string | undefined>;
  const user = (req as any).user;
  let targetCreatedById = createdById;
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    targetCreatedById = user.id; // Prevent horizontal privilege escalation
  }
  const reviews = await listEvidenceReviews({ entityType, entityId, status, createdById: targetCreatedById });
  res.json(reviews);
}));

evidenceRouter.patch("/:id/approve", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const existing = await prisma.evidenceReview.findUnique({ where: { id: req.params.id as string } });
  if (!existing) return res.status(404).json({ error: "Evidence review not found" });

  const isAuthorized = user.role === "ADMIN" || user.role === "MANAGER" || existing.createdById === user.id;
  if (!isAuthorized) {
    return res.status(403).json({ error: "Unauthorized to approve this review", code: "FORBIDDEN" });
  }

  const review = await approveEvidenceReview(req.params.id as string, user.id, (req as any).body?.comment);
  await recordAutomationAudit({
    actionType: "CRM_UPDATE",
    entityType: "EVIDENCE_REVIEW",
    entityId: review.id,
    actorType: "USER",
    actorId: user.id,
    newState: { status: review.status, comment: review.comment },
  });
  res.json(review);
}));

evidenceRouter.patch("/:id/reject", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const existing = await prisma.evidenceReview.findUnique({ where: { id: req.params.id as string } });
  if (!existing) return res.status(404).json({ error: "Evidence review not found" });

  const isAuthorized = user.role === "ADMIN" || user.role === "MANAGER" || existing.createdById === user.id;
  if (!isAuthorized) {
    return res.status(403).json({ error: "Unauthorized to reject this review", code: "FORBIDDEN" });
  }

  const review = await rejectEvidenceReview(req.params.id as string, user.id, (req as any).body?.comment);
  await recordAutomationAudit({
    actionType: "CRM_UPDATE",
    entityType: "EVIDENCE_REVIEW",
    entityId: review.id,
    actorType: "USER",
    actorId: user.id,
    newState: { status: review.status, comment: review.comment },
  });
  res.json(review);
}));

evidenceRouter.post("/decay", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return res.status(403).json({ error: "Unauthorized to trigger decay maintenance", code: "FORBIDDEN" });
  }
  const count = await decayStaleEvidenceReviews();
  res.json({ decayed: count });
}));
