// Outbound webhook and integration mapping routes.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";

export const outboundWebhooksRouter = Router();
outboundWebhooksRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

const webhookSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  secret: z.string().optional().nullable(),
  events: z.array(z.string()).min(1).max(20),
  isActive: z.boolean().optional().default(true),
  retryCount: z.number().int().nonnegative().max(10).optional().default(3),
  timeoutMs: z.number().int().positive().max(30000).optional().default(5000),
});

type WebhookInput = z.infer<typeof webhookSchema>;

const mappingSchema = z.object({
  provider: z.string().min(1).max(100),
  mappingType: z.string().min(1).max(100),
  mapping: z.record(z.unknown()).optional().default({}),
  isActive: z.boolean().optional().default(true),
});

type MappingInput = z.infer<typeof mappingSchema>;

outboundWebhooksRouter.get("/webhooks", asyncHandler(async (_req, res) => {
  const webhooks = await prisma.outboundWebhook.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(webhooks);
}));

outboundWebhooksRouter.post("/webhooks", canWrite, validate({ body: webhookSchema }), asyncHandler(async (req, res) => {
  const body = req.body as WebhookInput;
  const webhook = await prisma.outboundWebhook.create({
    data: {
      name: body.name,
      url: body.url,
      secret: body.secret,
      events: body.events,
      isActive: body.isActive ?? true,
      retryCount: body.retryCount,
      timeoutMs: body.timeoutMs,
      createdById: req.user!.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.status(201).json(webhook);
}));

outboundWebhooksRouter.get("/webhooks/:id", asyncHandler(async (req, res) => {
  const webhook = await prisma.outboundWebhook.findUnique({
    where: { id: param(req, "id") },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!webhook) throw notFound("Webhook not found");
  res.json(webhook);
}));

outboundWebhooksRouter.patch("/webhooks/:id", canWrite, validate({ body: webhookSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as Partial<WebhookInput>;
  const existing = await prisma.outboundWebhook.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Webhook not found");

  const data: Record<string, unknown> = {};
  for (const key of ["name", "url", "secret", "events", "isActive", "retryCount", "timeoutMs"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const webhook = await prisma.outboundWebhook.update({
    where: { id: param(req, "id") },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(webhook);
}));

outboundWebhooksRouter.delete("/webhooks/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.outboundWebhook.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));

outboundWebhooksRouter.get("/mappings", asyncHandler(async (_req, res) => {
  const mappings = await prisma.integrationMapping.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(mappings);
}));

outboundWebhooksRouter.post("/mappings", canWrite, validate({ body: mappingSchema }), asyncHandler(async (req, res) => {
  const body = req.body as MappingInput;
  const mapping = await prisma.integrationMapping.create({
    data: {
      provider: body.provider,
      mappingType: body.mappingType,
      mapping: JSON.stringify(body.mapping),
      isActive: body.isActive ?? true,
      createdById: req.user!.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.status(201).json(mapping);
}));

outboundWebhooksRouter.patch("/mappings/:id", canWrite, validate({ body: mappingSchema.partial() }), asyncHandler(async (req, res) => {
  const body = req.body as Partial<MappingInput>;
  const existing = await prisma.integrationMapping.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Integration mapping not found");

  const data: Record<string, unknown> = {};
  for (const key of ["provider", "mappingType", "isActive"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.mapping !== undefined) data.mapping = JSON.stringify(body.mapping);

  const mapping = await prisma.integrationMapping.update({
    where: { id: param(req, "id") },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(mapping);
}));

outboundWebhooksRouter.delete("/mappings/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.integrationMapping.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));
