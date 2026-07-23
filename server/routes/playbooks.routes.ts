// Playbook routes: CRUD for playbooks, versions, test runs, and approvals.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const playbooksRouter = Router();
playbooksRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

const playbookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  type: z.enum(["OUTREACH", "QUALIFICATION", "NURTURING", "CUSTOM"]).default("OUTREACH"),
  isActive: z.boolean().optional().default(true),
});

type PlaybookInput = z.infer<typeof playbookSchema>;

const stepSchema = z.object({
  order: z.number().int().nonnegative(),
  name: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

type StepInput = z.infer<typeof stepSchema>;

const conditionSchema = z.object({
  operator: z.string().min(1),
  value: z.string().min(1),
  field: z.string().min(1),
  description: z.string().optional().default(""),
});

type ConditionInput = z.infer<typeof conditionSchema>;

const actionSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.unknown()).optional().default({}),
  description: z.string().optional().default(""),
  retryPolicy: z.enum(["NONE", "LINEAR", "EXPONENTIAL"]).default("NONE"),
  maxAttempts: z.number().int().nonnegative().default(3),
});

type ActionInput = z.infer<typeof actionSchema>;

const branchSchema = z.object({
  name: z.string().min(1).max(200),
  condition: z.string().min(1),
  targetStepOrder: z.number().int().nonnegative(),
});

type BranchInput = z.infer<typeof branchSchema>;

const versionSchema = z.object({
  changelog: z.string().optional().default(""),
  steps: z.array(stepSchema).min(1).max(50),
  conditions: z.array(conditionSchema).optional().default([]),
  actions: z.array(actionSchema).optional().default([]),
  branches: z.array(branchSchema).optional().default([]),
});

type VersionInput = z.infer<typeof versionSchema>;

playbooksRouter.get("/", asyncHandler(async (_req, res) => {
  const playbooks = await prisma.playbook.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        where: { isActive: true },
        orderBy: { version: "desc" },
        take: 1,
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
  });
  res.json(playbooks);
}));

playbooksRouter.post("/", canWrite, validate({ body: playbookSchema }), asyncHandler(async (req, res) => {
  const body = req.body as PlaybookInput;
  const playbook = await prisma.playbook.create({
    data: {
      name: body.name,
      description: body.description,
      type: body.type,
      isActive: body.isActive ?? true,
      createdById: req.user!.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
  });
  res.status(201).json(playbook);
}));

playbooksRouter.get("/:id", asyncHandler(async (req, res) => {
  const playbook = await prisma.playbook.findUnique({
    where: { id: param(req, "id") },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        orderBy: { version: "desc" },
        include: {
          steps: { orderBy: { order: "asc" } },
          conditions: true,
          actions: true,
          branches: true,
        },
      },
    },
  });
  if (!playbook) throw notFound("Playbook not found");
  res.json(playbook);
}));

playbooksRouter.patch("/:id", canWrite, validate({ body: playbookSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as Partial<PlaybookInput>;
  const existing = await prisma.playbook.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Playbook not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "type", "isActive"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const playbook = await prisma.playbook.update({
    where: { id: param(req, "id") },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
  });
  res.json(playbook);
}));

playbooksRouter.delete("/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.playbook.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));

// Versions
playbooksRouter.get("/:id/versions", asyncHandler(async (req, res) => {
  const versions = await prisma.playbookVersion.findMany({
    where: { playbookId: param(req, "id") },
    orderBy: { version: "desc" },
    include: {
      steps: { orderBy: { order: "asc" } },
      conditions: true,
      actions: true,
      branches: true,
    },
  });
  res.json(versions);
}));

playbooksRouter.post("/:id/versions", canWrite, validate({ body: versionSchema }), asyncHandler(async (req, res) => {
  const playbookId = param(req, "id");
  const body = req.body as VersionInput;

  const playbook = await prisma.playbook.findUnique({ where: { id: playbookId } });
  if (!playbook) throw notFound("Playbook not found");

  const lastVersion = await prisma.playbookVersion.findFirst({
    where: { playbookId },
    orderBy: { version: "desc" },
  });

  const maxVersion = lastVersion?.version ?? 0;

  const version = await prisma.playbookVersion.create({
    data: {
      version: maxVersion + 1,
      changelog: body.changelog,
      playbookId,
      status: "DRAFT",
      steps: {
        create: body.steps.map((s) => ({
          order: s.order,
          name: s.name,
          description: s.description,
          isActive: s.isActive ?? true,
        })),
      },
      conditions: {
        create: body.conditions.map((c) => ({
          operator: c.operator,
          value: c.value,
          field: c.field,
          description: c.description,
        })),
      },
      actions: {
        create: body.actions.map((a) => ({
          type: a.type,
          config: JSON.stringify(a.config),
          description: a.description,
          retryPolicy: a.retryPolicy,
          maxAttempts: a.maxAttempts,
        })),
      },
      branches: {
        create: body.branches.map((b) => ({
          name: b.name,
          condition: b.condition,
          targetStepOrder: b.targetStepOrder,
        })),
      },
    },
    include: {
      steps: { orderBy: { order: "asc" } },
      conditions: true,
      actions: true,
      branches: true,
    },
  });

  res.status(201).json(version);
}));

playbooksRouter.post("/:id/versions/:versionId/publish", canWrite, asyncHandler(async (req, res) => {
  const versionId = param(req, "versionId");

  const version = await prisma.playbookVersion.findUnique({ where: { id: versionId } });
  if (!version) throw notFound("Version not found");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.playbookVersion.updateMany({
      where: { playbookId: version.playbookId, isActive: true },
      data: { isActive: false },
    });
    return tx.playbookVersion.update({
      where: { id: versionId },
      data: { status: "PUBLISHED", isActive: true },
      include: {
        steps: { orderBy: { order: "asc" } },
        conditions: true,
        actions: true,
        branches: true,
      },
    });
  });

  res.json(updated);
}));

playbooksRouter.post("/:id/versions/:versionId/rollback", canWrite, asyncHandler(async (req, res) => {
  const versionId = param(req, "versionId");

  const version = await prisma.playbookVersion.findUnique({ where: { id: versionId } });
  if (!version) throw notFound("Version not found");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.playbookVersion.updateMany({
      where: { playbookId: version.playbookId, isActive: true },
      data: { isActive: false, status: "ROLLED_BACK" },
    });
    return tx.playbookVersion.update({
      where: { id: versionId },
      data: { isActive: true, status: "PUBLISHED", rolledBackFromVersionId: version.id },
      include: {
        steps: { orderBy: { order: "asc" } },
        conditions: true,
        actions: true,
        branches: true,
      },
    });
  });

  res.json(updated);
}));

// Test runs
playbooksRouter.post("/:id/versions/:versionId/test", asyncHandler(async (req, res) => {
  const versionId = param(req, "versionId");

  const version = await prisma.playbookVersion.findUnique({ where: { id: versionId } });
  if (!version) throw notFound("Version not found");

  const testRun = await prisma.playbookTestRun.create({
    data: {
      status: "RUNNING",
      versionId,
      createdById: req.user!.id,
      startedAt: new Date(),
    },
  });

  res.status(201).json(testRun);
}));

playbooksRouter.patch("/:id/versions/:versionId/test-runs/:runId", asyncHandler(async (req, res) => {
  const runId = param(req, "runId");
  const body = req.body as { status?: string; executionLog?: unknown[]; error?: string };

  const testRun = await prisma.playbookTestRun.findUnique({ where: { id: runId } });
  if (!testRun) throw notFound("Test run not found");

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.executionLog) data.executionLog = JSON.stringify(body.executionLog);
  if (body.error) data.error = body.error;
  if (body.status === "COMPLETED" || body.status === "FAILED") {
    data.completedAt = new Date();
  }

  const updated = await prisma.playbookTestRun.update({
    where: { id: runId },
    data,
  });

  res.json(updated);
}));

playbooksRouter.get("/:id/versions/:versionId/test-runs", asyncHandler(async (req, res) => {
  const versionId = param(req, "versionId");
  const runs = await prisma.playbookTestRun.findMany({
    where: { versionId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(runs);
}));

// Approvals
playbooksRouter.post("/:id/versions/:versionId/approve", canWrite, asyncHandler(async (req, res) => {
  const versionId = param(req, "versionId");
  const body = req.body as { comment?: string };

  const existing = await prisma.playbookApproval.findFirst({
    where: { versionId, status: "PENDING" },
  });

  let approval;
  if (existing) {
    approval = await prisma.playbookApproval.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        comment: body.comment,
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  } else {
    approval = await prisma.playbookApproval.create({
      data: {
        versionId,
        status: "APPROVED",
        comment: body.comment,
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
        requestedById: req.user!.id,
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  await prisma.playbookVersion.update({
    where: { id: versionId },
    data: { status: "APPROVED" },
  });

  res.status(201).json(approval);
}));

playbooksRouter.post("/:id/versions/:versionId/reject", canWrite, asyncHandler(async (req, res) => {
  const versionId = param(req, "versionId");
  const body = req.body as { comment: string };

  const approval = await prisma.playbookApproval.create({
    data: {
      versionId,
      status: "REJECTED",
      comment: body.comment,
      reviewedById: req.user!.id,
      requestedById: req.user!.id,
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.playbookVersion.update({
    where: { id: versionId },
    data: { status: "REJECTED" },
  });

  res.status(201).json(approval);
}));

playbooksRouter.get("/:id/versions/:versionId/approvals", asyncHandler(async (req, res) => {
  const versionId = param(req, "versionId");
  const approvals = await prisma.playbookApproval.findMany({
    where: { versionId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(approvals);
}));
