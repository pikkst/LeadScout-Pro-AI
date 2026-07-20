// Follow-up sequence routes: CRUD for sequences and steps, start/stop executions.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const sequencesRouter = Router();
sequencesRouter.use(requireAuth);
sequencesRouter.use(requireRole("ADMIN", "MANAGER"));

const stepSchema = z.object({
  order: z.number().int().nonnegative(),
  delayDays: z.number().int().nonnegative().default(0),
  actionType: z.enum(["EMAIL", "TASK", "WEBHOOK"]).default("TASK"),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  taskName: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
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

sequencesRouter.post("/", validate({ body: sequenceSchema }), asyncHandler(async (req, res) => {
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
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  res.status(201).json(sequence);
}));

sequencesRouter.patch("/:id", validate({ body: sequenceSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as SequencePatchInput;
  const existing = await prisma.followUpSequence.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Sequence not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "triggerStage", "isActive"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (body.steps) {
    await prisma.sequenceStep.deleteMany({ where: { sequenceId: param(req, "id") } });
    data.steps = {
      create: body.steps.map(s => ({
        order: s.order,
        delayDays: s.delayDays,
        actionType: s.actionType,
        subject: s.subject ?? null,
        body: s.body ?? null,
        taskName: s.taskName ?? null,
        isActive: s.isActive ?? true,
      })),
    };
  }

  const sequence = await prisma.followUpSequence.update({
    where: { id: param(req, "id") },
    data,
    include: { steps: { orderBy: { order: "asc" } } },
  });
  res.json(sequence);
}));

sequencesRouter.delete("/:id", asyncHandler(async (req, res) => {
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
