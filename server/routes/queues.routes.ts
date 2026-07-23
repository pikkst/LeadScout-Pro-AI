// Queue governance routes: shared queues, queue items, and workload caps.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const queuesRouter = Router();
queuesRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

const queueSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  type: z.string().min(1),
  isActive: z.boolean().optional().default(true),
});

type QueueInput = z.infer<typeof queueSchema>;

const queueItemSchema = z.object({
  queueId: z.string().min(1),
  leadId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  opportunityId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  notes: z.string().optional().default(""),
  assignedToId: z.string().optional().nullable(),
});

type QueueItemInput = z.infer<typeof queueItemSchema>;

const workloadCapSchema = z.object({
  userId: z.string().min(1),
  maxActiveLeads: z.number().int().nonnegative(),
  maxActiveDeals: z.number().int().nonnegative(),
  maxQueueItems: z.number().int().nonnegative(),
  alertThreshold: z.number().min(0).max(1).optional().default(0.8),
});

type WorkloadCapInput = z.infer<typeof workloadCapSchema>;

queuesRouter.get("/queues", asyncHandler(async (_req, res) => {
  const queues = await prisma.dealQueue.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
    },
  });
  res.json(queues);
}));

queuesRouter.post("/queues", canWrite, validate({ body: queueSchema }), asyncHandler(async (req, res) => {
  const body = req.body as QueueInput;
  const queue = await prisma.dealQueue.create({
    data: {
      name: body.name,
      description: body.description,
      type: body.type,
      isActive: body.isActive ?? true,
      createdById: req.user!.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
    },
  });
  res.status(201).json(queue);
}));

queuesRouter.get("/queues/:id", asyncHandler(async (req, res) => {
  const queue = await prisma.dealQueue.findUnique({
    where: { id: param(req, "id") },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      items: {
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!queue) throw notFound("Queue not found");
  res.json(queue);
}));

queuesRouter.patch("/queues/:id", canWrite, validate({ body: queueSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as Partial<QueueInput>;
  const existing = await prisma.dealQueue.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Queue not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "type", "isActive"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const queue = await prisma.dealQueue.update({
    where: { id: param(req, "id") },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
    },
  });
  res.json(queue);
}));

queuesRouter.delete("/queues/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.dealQueue.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));

// Queue items
queuesRouter.get("/items", asyncHandler(async (req, res) => {
  const { queueId, status, assigneeId } = req.query as Record<string, string | undefined>;

  const where: Record<string, unknown> = {};
  if (queueId) where.queueId = queueId;
  if (status) where.status = status;
  if (assigneeId) where.assignedToId = assigneeId;

  const items = await prisma.queueItem.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: {
      queue: { select: { id: true, name: true, type: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(items);
}));

queuesRouter.post("/items", canWrite, validate({ body: queueItemSchema }), asyncHandler(async (req, res) => {
  const body = req.body as QueueItemInput;
  const item = await prisma.queueItem.create({
    data: {
      queueId: body.queueId,
      leadId: body.leadId,
      dealId: body.dealId,
      opportunityId: body.opportunityId,
      priority: body.priority,
      notes: body.notes,
      assignedToId: body.assignedToId,
    },
    include: {
      queue: { select: { id: true, name: true, type: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  res.status(201).json(item);
}));

queuesRouter.patch("/items/:itemId", canWrite, validate({
  body: z.object({
    status: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    notes: z.string().optional(),
    assignedToId: z.string().optional().nullable(),
    resolvedAt: z.string().optional().nullable(),
  }),
}), asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const existing = await prisma.queueItem.findUnique({ where: { id: param(req, "itemId") } });
  if (!existing) throw notFound("Queue item not found");

  const data: Record<string, unknown> = {};
  for (const key of ["status", "priority", "notes", "assignedToId"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.resolvedAt !== undefined) data.resolvedAt = body.resolvedAt ? new Date(body.resolvedAt as string) : null;

  const item = await prisma.queueItem.update({
    where: { id: param(req, "itemId") },
    data,
    include: {
      queue: { select: { id: true, name: true, type: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(item);
}));

queuesRouter.delete("/items/:itemId", canWrite, asyncHandler(async (req, res) => {
  await prisma.queueItem.delete({ where: { id: param(req, "itemId") } });
  res.json({ ok: true });
}));

// Workload caps
queuesRouter.get("/workload", asyncHandler(async (req, res) => {
  const caps = await prisma.workloadCap.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  res.json(caps);
}));

queuesRouter.get("/workload/me", asyncHandler(async (req, res) => {
  const cap = await prisma.workloadCap.findUnique({
    where: { userId: req.user!.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!cap) {
    const created = await prisma.workloadCap.create({
      data: {
        userId: req.user!.id,
        maxActiveLeads: 50,
        maxActiveDeals: 20,
        maxQueueItems: 10,
        alertThreshold: 0.8,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return res.json(created);
  }
  res.json(cap);
}));

queuesRouter.post("/workload", canWrite, validate({ body: workloadCapSchema }), asyncHandler(async (req, res) => {
  const body = req.body as WorkloadCapInput;
  const cap = await prisma.workloadCap.upsert({
    where: { userId: body.userId },
    update: {
      maxActiveLeads: body.maxActiveLeads,
      maxActiveDeals: body.maxActiveDeals,
      maxQueueItems: body.maxQueueItems,
      alertThreshold: body.alertThreshold,
    },
    create: {
      userId: body.userId,
      maxActiveLeads: body.maxActiveLeads,
      maxActiveDeals: body.maxActiveDeals,
      maxQueueItems: body.maxQueueItems,
      alertThreshold: body.alertThreshold,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  res.json(cap);
}));

queuesRouter.patch("/workload/me", canWrite, validate({ body: workloadCapSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as Partial<WorkloadCapInput>;
  const existing = await prisma.workloadCap.findUnique({ where: { userId: req.user!.id } });
  if (!existing) throw notFound("Workload cap not found");

  const data: Record<string, unknown> = {};
  for (const key of ["maxActiveLeads", "maxActiveDeals", "maxQueueItems", "alertThreshold"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const cap = await prisma.workloadCap.update({
    where: { userId: req.user!.id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  res.json(cap);
}));
