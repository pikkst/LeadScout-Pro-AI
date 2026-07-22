// Pitch template routes: save, list, update, delete reusable pitch templates.
// All routes require authentication.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { forbidden, notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { serializeTemplate } from "../utils/serializers";
import { logActivity } from "../utils/activity";
import { param } from "../utils/param";

export const templatesRouter = Router();
templatesRouter.use(requireAuth);

function assertCanManageTemplate(user: NonNullable<Express.Request["user"]>, createdById: string | null) {
  if (user.role === "ADMIN" || user.role === "MANAGER" || createdById === user.id) return;
  throw forbidden("You cannot modify another user's template.");
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  htmlContent: z.string().min(1),
  textContent: z.string().optional().default(""),
  focus: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

templatesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const templates = await prisma.pitchTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
    res.json(templates.map(serializeTemplate));
  }),
);

templatesRouter.post(
  "/",
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const template = await prisma.pitchTemplate.create({
      data: {
        name: body.name,
        subject: body.subject,
        htmlContent: body.htmlContent,
        textContent: body.textContent ?? "",
        focus: body.focus ?? null,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { name: true } } },
    });
    await logActivity({ action: "TEMPLATE_CREATED", detail: template.name, userId: req.user!.id });
    res.status(201).json(serializeTemplate(template));
  }),
);

templatesRouter.patch(
  "/:id",
  validate({ body: updateSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateSchema>;
    const existing = await prisma.pitchTemplate.findUnique({ where: { id: param(req, "id") } });
    if (!existing) throw notFound("Template not found");
    assertCanManageTemplate(req.user!, existing.createdById);

    const data: Record<string, unknown> = {};
    for (const key of ["name", "subject", "htmlContent", "textContent", "focus"] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const template = await prisma.pitchTemplate.update({
      where: { id: param(req, "id") },
      data,
      include: { createdBy: { select: { name: true } } },
    });
    await logActivity({ action: "TEMPLATE_UPDATED", detail: template.name, userId: req.user!.id });
    res.json(serializeTemplate(template));
  }),
);

templatesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.pitchTemplate.findUnique({ where: { id: param(req, "id") } });
    if (!existing) throw notFound("Template not found");
    assertCanManageTemplate(req.user!, existing.createdById);
    await prisma.pitchTemplate.delete({ where: { id: param(req, "id") } });
    await logActivity({ action: "TEMPLATE_DELETED", detail: existing.name, userId: req.user!.id });
    res.json({ ok: true });
  }),
);
