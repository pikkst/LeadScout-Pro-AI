// Qualification playbook routes: CRUD for playbooks, stages, criterions, and deal qualifications.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const qualificationRouter = Router();
qualificationRouter.use(requireAuth);

const canWrite = requireAuth;

const playbookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  framework: z.enum(["BANT", "MEDDPICC", "SPICED", "CUSTOM"]),
  isActive: z.boolean().optional().default(true),
  isCustom: z.boolean().optional().default(false),
});

type PlaybookInput = z.infer<typeof playbookSchema>;

const stageSchema = z.object({
  name: z.string().min(1).max(200),
  key: z.string().min(1).max(100),
  description: z.string().optional().default(""),
  sortOrder: z.number().int().nonnegative().default(0),
  isRequired: z.boolean().optional().default(true),
});

type StageInput = z.infer<typeof stageSchema>;

const criterionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  evidenceType: z.string().min(1),
  options: z.string().optional().nullable(),
  isRequired: z.boolean().optional().default(false),
});

type CriterionInput = z.infer<typeof criterionSchema>;

qualificationRouter.get("/playbooks", asyncHandler(async (_req, res) => {
  const playbooks = await prisma.qualificationPlaybook.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      stages: { orderBy: { sortOrder: "asc" }, include: { criterions: true } },
    },
  });
  res.json(playbooks);
}));

qualificationRouter.post("/playbooks", canWrite, validate({ body: playbookSchema }), asyncHandler(async (req, res) => {
  const body = req.body as PlaybookInput;
  const playbook = await prisma.qualificationPlaybook.create({
    data: {
      name: body.name,
      description: body.description,
      framework: body.framework,
      isActive: body.isActive ?? true,
      isCustom: body.isCustom ?? false,
      createdById: req.user!.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      stages: { orderBy: { sortOrder: "asc" }, include: { criterions: true } },
    },
  });
  res.status(201).json(playbook);
}));

qualificationRouter.get("/playbooks/:id", asyncHandler(async (req, res) => {
  const playbook = await prisma.qualificationPlaybook.findUnique({
    where: { id: param(req, "id") },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      stages: {
        orderBy: { sortOrder: "asc" },
        include: { criterions: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!playbook) throw notFound("Qualification playbook not found");
  res.json(playbook);
}));

qualificationRouter.patch("/playbooks/:id", canWrite, validate({ body: playbookSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as Partial<PlaybookInput>;
  const existing = await prisma.qualificationPlaybook.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Qualification playbook not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "framework", "isActive", "isCustom"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const playbook = await prisma.qualificationPlaybook.update({
    where: { id: param(req, "id") },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      stages: { orderBy: { sortOrder: "asc" }, include: { criterions: true } },
    },
  });
  res.json(playbook);
}));

qualificationRouter.delete("/playbooks/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.qualificationPlaybook.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));

// Stages
qualificationRouter.post("/playbooks/:id/stages", canWrite, validate({ body: stageSchema }), asyncHandler(async (req, res) => {
  const body = req.body as StageInput;
  const existing = await prisma.qualificationPlaybook.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Playbook not found");

  const stage = await prisma.qualificationStage.create({
    data: {
      name: body.name,
      key: body.key,
      description: body.description,
      sortOrder: body.sortOrder,
      isRequired: body.isRequired,
      playbookId: param(req, "id"),
    },
    include: { criterions: true },
  });
  res.status(201).json(stage);
}));

qualificationRouter.patch("/stages/:stageId", canWrite, validate({ body: stageSchema }), asyncHandler(async (req, res) => {
  const body = req.body as StageInput;
  const existing = await prisma.qualificationStage.findUnique({ where: { id: param(req, "stageId") } });
  if (!existing) throw notFound("Stage not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "key", "description", "sortOrder", "isRequired"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const stage = await prisma.qualificationStage.update({
    where: { id: param(req, "stageId") },
    data,
    include: { criterions: true },
  });
  res.json(stage);
}));

qualificationRouter.delete("/stages/:stageId", canWrite, asyncHandler(async (req, res) => {
  await prisma.qualificationStage.delete({ where: { id: param(req, "stageId") } });
  res.json({ ok: true });
}));

// Criterions
qualificationRouter.post("/stages/:stageId/criterions", canWrite, validate({ body: criterionSchema }), asyncHandler(async (req, res) => {
  const body = req.body as CriterionInput;
  const existing = await prisma.qualificationStage.findUnique({ where: { id: param(req, "stageId") } });
  if (!existing) throw notFound("Stage not found");

  const criterion = await prisma.qualificationCriterion.create({
    data: {
      name: body.name,
      description: body.description,
      evidenceType: body.evidenceType,
      options: body.options,
      isRequired: body.isRequired,
      stageId: param(req, "stageId"),
    },
  });
  res.status(201).json(criterion);
}));

qualificationRouter.patch("/criterions/:criterionId", canWrite, validate({ body: criterionSchema }), asyncHandler(async (req, res) => {
  const body = req.body as CriterionInput;
  const existing = await prisma.qualificationCriterion.findUnique({ where: { id: param(req, "criterionId") } });
  if (!existing) throw notFound("Criterion not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "evidenceType", "options", "isRequired"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const criterion = await prisma.qualificationCriterion.update({
    where: { id: param(req, "criterionId") },
    data,
  });
  res.json(criterion);
}));

qualificationRouter.delete("/criterions/:criterionId", canWrite, asyncHandler(async (req, res) => {
  await prisma.qualificationCriterion.delete({ where: { id: param(req, "criterionId") } });
  res.json({ ok: true });
}));

// Deal qualifications
qualificationRouter.get("/deals/:dealId", asyncHandler(async (req, res) => {
  const qualifications = await prisma.dealQualification.findMany({
    where: { dealId: param(req, "dealId") },
    include: {
      stage: {
        include: {
          playbook: {
            include: {
              createdBy: { select: { id: true, name: true, email: true } },
            },
          },
          criterions: true,
        },
      },
      checkedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { stage: { sortOrder: "asc" } },
  });
  res.json(qualifications);
}));

qualificationRouter.post("/deals/:dealId", canWrite, validate({
  body: z.object({
    stageId: z.string().min(1),
    evidence: z.string().optional().default(""),
    isMet: z.boolean().optional().default(false),
  }),
}), asyncHandler(async (req, res) => {
  const body = req.body as { stageId: string; evidence?: string; isMet?: boolean };

  const existing = await prisma.dealQualification.findFirst({
    where: { dealId: param(req, "dealId"), stageId: body.stageId },
  });

  let qualification;
  if (existing) {
    qualification = await prisma.dealQualification.update({
      where: { id: existing.id },
      data: {
        evidence: body.evidence ?? existing.evidence,
        isMet: body.isMet ?? existing.isMet,
        checkedById: req.user!.id,
        updatedAt: new Date(),
      },
      include: {
        stage: {
          include: {
            playbook: { include: { createdBy: { select: { id: true, name: true, email: true } } } },
            criterions: true,
          },
        },
        checkedBy: { select: { id: true, name: true, email: true } },
      },
    });
  } else {
    qualification = await prisma.dealQualification.create({
      data: {
        dealId: param(req, "dealId"),
        stageId: body.stageId,
        evidence: body.evidence ?? "",
        isMet: body.isMet ?? false,
        checkedById: req.user!.id,
      },
      include: {
        stage: {
          include: {
            playbook: { include: { createdBy: { select: { id: true, name: true, email: true } } } },
            criterions: true,
          },
        },
        checkedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  res.status(existing ? 200 : 201).json(qualification);
}));
