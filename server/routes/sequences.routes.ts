// Follow-up sequence routes: CRUD for sequences and steps, start/stop executions.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const sequencesRouter = Router();
sequencesRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

const stepSchema = z.object({
  order: z.number().int().nonnegative(),
  delayDays: z.number().int().nonnegative().default(0),
  actionType: z.enum(["EMAIL", "TASK", "WEBHOOK"]).default("TASK"),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  taskName: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  triggerEvent: z.enum(["SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED", "BOUNCED", "FAILED"]).optional().nullable(),
  eventDelayDays: z.number().int().nonnegative().optional().nullable(),
  stopOnEvent: z.boolean().optional().default(false),
});

type StepInput = z.infer<typeof stepSchema>;

const sequenceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  triggerStage: z.string().min(1),
  isActive: z.boolean().optional().default(true),
  steps: z.array(stepSchema).min(1).max(20),
});

type SequenceInput = z.infer<typeof sequenceSchema>;
type SequencePatchInput = Partial<SequenceInput>;

sequencesRouter.get("/", asyncHandler(async (_req, res) => {
  const sequences = await prisma.followUpSequence.findMany({
    orderBy: { createdAt: "desc" },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  res.json(sequences);
}));

sequencesRouter.post("/", canWrite, validate({ body: sequenceSchema }), asyncHandler(async (req, res) => {
  const body = req.body as SequenceInput;
  const sequence = await prisma.followUpSequence.create({
    data: {
      name: body.name,
      description: body.description ?? "",
      triggerStage: body.triggerStage,
      isActive: body.isActive ?? true,
      steps: {
        create: body.steps.map(s => ({
          order: s.order,
          delayDays: s.delayDays,
          actionType: s.actionType,
          subject: s.subject ?? null,
          body: s.body ?? null,
          taskName: s.taskName ?? null,
          isActive: s.isActive ?? true,
          triggerEvent: s.triggerEvent ?? null,
          eventDelayDays: s.eventDelayDays ?? null,
          stopOnEvent: s.stopOnEvent ?? false,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  res.status(201).json(sequence);
}));

sequencesRouter.patch("/:id", canWrite, validate({ body: sequenceSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as SequencePatchInput;
  const existing = await prisma.followUpSequence.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Sequence not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "triggerStage", "isActive"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (body.steps) {
    const steps = body.steps;
    const scalarData = { ...data };
    const sequence = await prisma.$transaction(async (tx) => {
      await tx.sequenceStep.deleteMany({ where: { sequenceId: param(req, "id") } });
      return tx.followUpSequence.update({
        where: { id: param(req, "id") },
        data: {
          ...scalarData,
          steps: {
            create: steps.map(s => ({
              order: s.order,
              delayDays: s.delayDays,
              actionType: s.actionType,
              subject: s.subject ?? null,
              body: s.body ?? null,
              taskName: s.taskName ?? null,
              isActive: s.isActive ?? true,
              triggerEvent: s.triggerEvent ?? null,
              eventDelayDays: s.eventDelayDays ?? null,
              stopOnEvent: s.stopOnEvent ?? false,
            })),
          },
        },
        include: { steps: { orderBy: { order: "asc" } } },
      });
    });
    return res.json(sequence);
  }

  const sequence = await prisma.followUpSequence.update({
    where: { id: param(req, "id") },
    data,
    include: { steps: { orderBy: { order: "asc" } } },
  });
  res.json(sequence);
}));

sequencesRouter.delete("/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.followUpSequence.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));

// Start a sequence for a lead
sequencesRouter.post("/:id/start/:leadId", asyncHandler(async (req, res) => {
  const sequence = await prisma.followUpSequence.findUnique({
    where: { id: param(req, "id") },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!sequence || !sequence.isActive) throw notFound("Sequence not found or inactive");

  const lead = await prisma.lead.findUnique({ where: { id: param(req, "leadId") } });
  if (!lead) throw notFound("Lead not found");

  const existing = await prisma.sequenceExecution.findFirst({
    where: { leadId: lead.id, sequenceId: sequence.id, status: "ACTIVE" },
  });
  if (existing) {
    res.json(existing);
    return;
  }

  const firstStep = sequence.steps[0];
  const nextRun = new Date();
  nextRun.setDate(nextRun.getDate() + (firstStep?.delayDays ?? 0));

  const execution = await prisma.sequenceExecution.create({
    data: {
      leadId: lead.id,
      sequenceId: sequence.id,
      status: "ACTIVE",
      currentStep: 0,
      nextRunAt: nextRun,
    },
  });

  res.status(201).json(execution);
}));

// Stop a sequence for a lead
sequencesRouter.post("/:id/stop/:leadId", asyncHandler(async (req, res) => {
  const execution = await prisma.sequenceExecution.findFirst({
    where: { leadId: param(req, "leadId"), sequenceId: param(req, "id"), status: "ACTIVE" },
  });
  if (!execution) throw notFound("Active execution not found");

  const updated = await prisma.sequenceExecution.update({
    where: { id: execution.id },
    data: { status: "STOPPED", completedAt: new Date() },
  });
  res.json(updated);
}));

// List executions for a lead
sequencesRouter.get("/lead/:leadId", asyncHandler(async (req, res) => {
  const executions = await prisma.sequenceExecution.findMany({
    where: { leadId: param(req, "leadId") },
    include: { sequence: true },
    orderBy: { startedAt: "desc" },
  });
  res.json(executions);
}));

// Sequence versioning
sequencesRouter.get("/:id/versions", asyncHandler(async (req, res) => {
  const versions = await prisma.sequenceVersion.findMany({
    where: { sequenceId: param(req, "id") },
    orderBy: { version: "desc" },
  });
  res.json(versions);
}));

sequencesRouter.post("/:id/versions", canWrite, validate({
  body: z.object({
    changelog: z.string().optional().default(""),
    stepsJson: z.string().min(1),
  }),
}), asyncHandler(async (req, res) => {
  const sequenceId = param(req, "id");
  const body = req.body as { changelog?: string; stepsJson: string };

  const lastVersion = await prisma.sequenceVersion.findFirst({
    where: { sequenceId },
    orderBy: { version: "desc" },
  });

  const maxVersion = lastVersion?.version ?? 0;

  const version = await prisma.sequenceVersion.create({
    data: {
      version: maxVersion + 1,
      changelog: body.changelog,
      sequenceId,
      stepsJson: body.stepsJson,
    },
  });

  res.status(201).json(version);
}));

sequencesRouter.post("/:id/versions/:version/rollback", canWrite, asyncHandler(async (req, res) => {
  const version = await prisma.sequenceVersion.findFirst({
    where: { sequenceId: param(req, "id"), version: parseInt(param(req, "version")) },
  });
  if (!version) throw notFound("Version not found");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sequenceVersion.updateMany({
      where: { sequenceId: param(req, "id"), isActive: true },
      data: { isActive: false },
    });
    return tx.sequenceVersion.update({
      where: { id: version.id },
      data: { isActive: true, rolledBackFromVersionId: version.id },
    });
  });

  res.json(updated);
}));

sequencesRouter.post("/:id/versions/:version/publish", canWrite, asyncHandler(async (req, res) => {
  const version = await prisma.sequenceVersion.findFirst({
    where: { sequenceId: param(req, "id"), version: parseInt(param(req, "version")) },
  });
  if (!version) throw notFound("Version not found");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sequenceVersion.updateMany({
      where: { sequenceId: param(req, "id"), isActive: true },
      data: { isActive: false },
    });
    return tx.sequenceVersion.update({
      where: { id: version.id },
      data: { isActive: true },
    });
  });

  res.json(updated);
}));

// A/B tests
sequencesRouter.get("/:id/versions/:version/ab-tests", asyncHandler(async (req, res) => {
  const version = await prisma.sequenceVersion.findFirst({
    where: { sequenceId: param(req, "id"), version: parseInt(param(req, "version")) },
  });
  if (!version) throw notFound("Version not found");

  const abTests = await prisma.sequenceABTest.findMany({
    where: { versionId: version.id },
    include: { variants: true },
  });
  res.json(abTests);
}));

sequencesRouter.post("/:id/versions/:version/ab-tests", canWrite, validate({
  body: z.object({
    name: z.string().min(1).max(200),
    metric: z.string().min(1),
    minSampleSize: z.number().int().nonnegative().default(100),
    confidenceLevel: z.number().min(0).max(1).default(0.95),
    variants: z.array(z.object({
      name: z.string().min(1).max(100),
      config: z.record(z.unknown()).default({}),
      isControl: z.boolean().default(false),
    })).min(2),
  }),
}), asyncHandler(async (req, res) => {
  const version = await prisma.sequenceVersion.findFirst({
    where: { sequenceId: param(req, "id"), version: parseInt(param(req, "version")) },
  });
  if (!version) throw notFound("Version not found");

  const body = req.body as {
    name: string;
    metric: string;
    minSampleSize: number;
    confidenceLevel: number;
    variants: Array<{ name: string; config: Record<string, unknown>; isControl: boolean }>;
  };

  const abTest = await prisma.sequenceABTest.create({
    data: {
      name: body.name,
      metric: body.metric,
      minSampleSize: body.minSampleSize,
      confidenceLevel: body.confidenceLevel,
      versionId: version.id,
      variants: {
        create: body.variants.map((v) => ({
          name: v.name,
          config: JSON.stringify(v.config),
          isControl: v.isControl,
        })),
      },
    },
    include: { variants: true },
  });

  res.status(201).json(abTest);
}));

sequencesRouter.patch("/:id/versions/:version/ab-tests/:abTestId", canWrite, validate({
  body: z.object({
    status: z.string().optional(),
  }),
}), asyncHandler(async (req, res) => {
  const abTest = await prisma.sequenceABTest.findFirst({
    where: {
      id: param(req, "abTestId"),
      version: {
        sequenceId: param(req, "id"),
        version: parseInt(param(req, "version")),
      },
    },
  });
  if (!abTest) throw notFound("A/B test not found");

  const body = req.body as { status?: string };
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;

  const updated = await prisma.sequenceABTest.update({
    where: { id: abTest.id },
    data,
    include: { variants: true },
  });
  res.json(updated);
}));

// Delivery windows
sequencesRouter.get("/:id/delivery-windows", asyncHandler(async (req, res) => {
  const windows = await prisma.sequenceDeliveryWindow.findMany({
    where: { sequenceId: param(req, "id") },
  });
  res.json(windows);
}));

sequencesRouter.post("/:id/delivery-windows", canWrite, validate({
  body: z.object({
    playbookId: z.string().optional().nullable(),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
    startTime: z.string().max(5),
    endTime: z.string().max(5),
    timezone: z.string().optional().default("UTC"),
    respectRecipientTimezone: z.boolean().optional().default(true),
  }),
}), asyncHandler(async (req, res) => {
  const body = req.body as {
    playbookId?: string | null;
    weekdays: number[];
    startTime: string;
    endTime: string;
    timezone: string;
    respectRecipientTimezone: boolean;
  };

  const window = await prisma.sequenceDeliveryWindow.create({
    data: {
      sequenceId: param(req, "id"),
      playbookId: body.playbookId,
      weekdays: body.weekdays,
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone,
      respectRecipientTimezone: body.respectRecipientTimezone,
    },
  });
  res.status(201).json(window);
}));

sequencesRouter.delete("/:id/delivery-windows/:windowId", canWrite, asyncHandler(async (req, res) => {
  await prisma.sequenceDeliveryWindow.deleteMany({
    where: { id: param(req, "windowId"), sequenceId: param(req, "id") },
  });
  res.json({ ok: true });
}));

// Sender rotation
sequencesRouter.get("/:id/sender-rotation", asyncHandler(async (req, res) => {
  const rotation = await prisma.sequenceSenderRotation.findFirst({
    where: { sequenceId: param(req, "id") },
  });
  res.json(rotation || {});
}));

sequencesRouter.post("/:id/sender-rotation", canWrite, validate({
  body: z.object({
    playbookId: z.string().optional().nullable(),
    senderIds: z.array(z.string().min(1)).min(1),
    rotationMode: z.string().optional().default("ROUND_ROBIN"),
    isActive: z.boolean().optional().default(true),
  }),
}), asyncHandler(async (req, res) => {
  const body = req.body as {
    playbookId?: string | null;
    senderIds: string[];
    rotationMode: string;
    isActive: boolean;
  };

  const existing = await prisma.sequenceSenderRotation.findFirst({
    where: { sequenceId: param(req, "id") },
  });

  let rotation;
  if (existing) {
    rotation = await prisma.sequenceSenderRotation.update({
      where: { id: existing.id },
      data: {
        playbookId: body.playbookId,
        senderIds: body.senderIds,
        rotationMode: body.rotationMode,
        isActive: body.isActive,
      },
    });
  } else {
    rotation = await prisma.sequenceSenderRotation.create({
      data: {
        sequenceId: param(req, "id"),
        playbookId: body.playbookId,
        senderIds: body.senderIds,
        rotationMode: body.rotationMode,
        isActive: body.isActive,
      },
    });
  }

  res.json(rotation);
}));
