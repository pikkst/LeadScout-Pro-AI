// Workspace threshold routes: solo-to-team auto-promotion configuration.
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getOrCreateWorkspaceThreshold, updateWorkspaceThreshold, evaluatePromotion } from "../services/workspaceThreshold.service";

export const workspaceThresholdsRouter = Router();
workspaceThresholdsRouter.use(requireAuth);

const updateSchema = z.object({
  autoPromoteUsers: z.coerce.number().int().min(1).optional(),
  autoPromoteLeads: z.coerce.number().int().min(1).optional(),
  autoPromoteAutomation: z.coerce.number().int().min(1).optional(),
  currentUserCount: z.coerce.number().int().min(0).optional(),
  currentLeadCount: z.coerce.number().int().min(0).optional(),
  currentAutomationCount: z.coerce.number().int().min(0).optional(),
});

workspaceThresholdsRouter.get("/", asyncHandler(async (req, res) => {
  const threshold = await getOrCreateWorkspaceThreshold(`workspace:${(req as any).user.id}`, (req as any).user.id);
  res.json(threshold);
}));

workspaceThresholdsRouter.put("/", validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  const threshold = await updateWorkspaceThreshold(`workspace:${(req as any).user.id}`, (req as any).body);
  res.json(threshold);
}));

workspaceThresholdsRouter.get("/evaluate", asyncHandler(async (req, res) => {
  const evaluation = await evaluatePromotion(`workspace:${(req as any).user.id}`);
  res.json(evaluation);
}));
