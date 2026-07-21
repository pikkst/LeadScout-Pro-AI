// Custom fields and deal stages routes - admin configurable CRM extensions.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const customFieldsRouter = Router();
customFieldsRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

const fieldSchema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(1).max(60).regex(/^[a-z0-9_]+$/),
  type: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "MULTISELECT", "BOOLEAN"]),
  options: z.string().optional().nullable(),
  isRequired: z.boolean().optional().default(false),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

type FieldInput = z.infer<typeof fieldSchema>;
type FieldPatchInput = Partial<FieldInput>;

customFieldsRouter.get("/", asyncHandler(async (_req, res) => {
  const fields = await prisma.customFieldDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });
  res.json(fields);
}));

customFieldsRouter.post("/", canWrite, validate({ body: fieldSchema }), asyncHandler(async (req, res) => {
  const body = req.body as FieldInput;
  const field = await prisma.customFieldDefinition.create({
    data: {
      name: body.name,
      key: body.key,
      type: body.type,
      options: body.options ?? null,
      isRequired: body.isRequired ?? false,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  res.status(201).json(field);
}));

customFieldsRouter.patch("/:id", canWrite, validate({ body: fieldSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as FieldPatchInput;
  const existing = await prisma.customFieldDefinition.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Field not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "key", "type", "options", "isRequired", "sortOrder"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const field = await prisma.customFieldDefinition.update({
    where: { id: param(req, "id") },
    data,
  });
  res.json(field);
}));

customFieldsRouter.delete("/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.customFieldDefinition.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));

export const dealStagesRouter = Router();
dealStagesRouter.use(requireAuth);

const stageSchema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(1).max(60).regex(/^[a-z0-9_]+$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#64748b"),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

type StageInput = z.infer<typeof stageSchema>;
type StagePatchInput = Partial<StageInput>;

dealStagesRouter.get("/", asyncHandler(async (_req, res) => {
  const stages = await prisma.dealStage.findMany({
    orderBy: { sortOrder: "asc" },
  });
  res.json(stages);
}));

dealStagesRouter.post("/", canWrite, validate({ body: stageSchema }), asyncHandler(async (req, res) => {
  const body = req.body as StageInput;
  const stage = await prisma.dealStage.create({
    data: {
      name: body.name,
      key: body.key,
      color: body.color,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  res.status(201).json(stage);
}));

dealStagesRouter.patch("/:id", canWrite, validate({ body: stageSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as StagePatchInput;
  const existing = await prisma.dealStage.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Stage not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "key", "color", "sortOrder", "isActive"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const stage = await prisma.dealStage.update({
    where: { id: param(req, "id") },
    data,
  });
  res.json(stage);
}));

dealStagesRouter.delete("/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.dealStage.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));
