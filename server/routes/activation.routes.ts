import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { applyOnboardingTemplate, getActivationState, getCommandCenter, ONBOARDING_TEMPLATES, setWizardDismissed } from "../services/activation.service";

export const activationRouter = Router();
activationRouter.use(requireAuth);

activationRouter.get("/state", asyncHandler(async (req, res) => {
  res.json(await getActivationState(req.user!));
}));

activationRouter.get("/templates", (_req, res) => {
  res.json(ONBOARDING_TEMPLATES);
});

activationRouter.post(
  "/template",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: z.object({ templateId: z.enum(["founder-sales", "agency", "partnerships", "recruiting", "channel-sales"]) }) }),
  asyncHandler(async (req, res) => {
    const template = await applyOnboardingTemplate(req.body.templateId, req.user!.id);
    res.json({ template, state: await getActivationState(req.user!) });
  }),
);

activationRouter.patch(
  "/wizard",
  validate({ body: z.object({ dismissed: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    await setWizardDismissed(req.user!.id, req.body.dismissed);
    res.json({ ok: true });
  }),
);

activationRouter.get("/command-center", asyncHandler(async (req, res) => {
  res.json(await getCommandCenter(req.user!));
}));
