import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { getDeliverabilityStatus, removeSuppression, suppressEmail } from "../services/compliance.service";
import { updateSettings } from "../services/settings.service";

export const complianceRouter = Router();
complianceRouter.use(requireAuth);

complianceRouter.get("/status", asyncHandler(async (_req, res) => {
  res.json(await getDeliverabilityStatus());
}));

complianceRouter.get("/suppressions", requireRole("ADMIN", "MANAGER"), asyncHandler(async (_req, res) => {
  res.json(await prisma.emailSuppression.findMany({ orderBy: { createdAt: "desc" }, take: 500 }));
}));

complianceRouter.post(
  "/suppressions",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: z.object({ email: z.string().email(), reason: z.string().min(2).max(500) }) }),
  asyncHandler(async (req, res) => {
    const entry = await suppressEmail({ email: req.body.email, reason: req.body.reason, source: "MANUAL", createdById: req.user!.id });
    res.status(201).json(entry);
  }),
);

complianceRouter.delete("/suppressions/:email", requireRole("ADMIN", "MANAGER"), asyncHandler(async (req, res) => {
  await removeSuppression(decodeURIComponent(String(req.params.email)));
  res.json({ ok: true });
}));

complianceRouter.put(
  "/policy",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: z.object({
    dailySendLimit: z.number().int().min(1).max(10_000),
    bounceThresholdPercent: z.number().min(0.1).max(100),
    complaintThresholdPercent: z.number().min(0.01).max(100),
  }) }),
  asyncHandler(async (req, res) => {
    await updateSettings({
      EMAIL_DAILY_SEND_LIMIT: String(req.body.dailySendLimit),
      EMAIL_BOUNCE_THRESHOLD_PERCENT: String(req.body.bounceThresholdPercent),
      EMAIL_COMPLAINT_THRESHOLD_PERCENT: String(req.body.complaintThresholdPercent),
    }, req.user!.id);
    res.json(await getDeliverabilityStatus());
  }),
);
