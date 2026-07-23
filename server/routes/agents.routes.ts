// Agent routes: CRUD for agent definitions and agent run execution.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";
import { listAgents, getAgentRuns, runAgent as serviceRunAgent, approveAgentRun as serviceApprove } from "../services/agentFramework.service";

export const agentsRouter = Router();
agentsRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

const agentTypeSchema = z.enum(["RESEARCH", "ROUTING", "BRIEFING", "FOLLOW_UP", "CRM_HYGIENE"]);

const agentDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  type: agentTypeSchema,
  description: z.string().optional().default(""),
  config: z.any().optional().default({}),
  budget: z.number().int().nonnegative().default(0),
  permissions: z.any().optional().default({}),
  approvalThreshold: z.number().int().nonnegative().default(0),
  isActive: z.boolean().optional().default(true),
});

type AgentDefinitionInput = z.infer<typeof agentDefinitionSchema>;

const runAgentSchema = z.object({
  input: z.record(z.unknown()).optional().default({}),
});

agentsRouter.get("/definitions", asyncHandler(async (req, res) => {
  const agents = await listAgents();
  res.json(agents);
}));

agentsRouter.post("/definitions", canWrite, validate({ body: agentDefinitionSchema }), asyncHandler(async (req, res) => {
  const body = req.body as AgentDefinitionInput;
  const agent = await prisma.agentDefinition.create({
    data: {
      name: body.name,
      type: body.type,
      description: body.description,
      config: body.config,
      budget: body.budget,
      permissions: body.permissions,
      approvalThreshold: body.approvalThreshold,
      isActive: body.isActive ?? true,
      createdById: req.user!.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { runs: true } },
    },
  });
  res.status(201).json(agent);
}));

agentsRouter.patch("/definitions/:id", canWrite, validate({ body: agentDefinitionSchema.partial() }), asyncHandler(async (req, res) => {
  const existing = await prisma.agentDefinition.findUnique({ where: { id: param(req, "id") } });
  if (!existing) throw notFound("Agent not found");

  const body = req.body as Partial<AgentDefinitionInput>;
  const data: Record<string, unknown> = {};
  for (const key of ["name", "description", "type", "isActive", "budget", "approvalThreshold"] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.config) data.config = body.config;
  if (body.permissions) data.permissions = body.permissions;

  const agent = await prisma.agentDefinition.update({
    where: { id: param(req, "id") },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { runs: true } },
    },
  });
  res.json(agent);
}));

agentsRouter.delete("/definitions/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.agentDefinition.delete({ where: { id: param(req, "id") } });
  res.json({ ok: true });
}));

agentsRouter.post("/definitions/:id/run", canWrite, validate({ body: runAgentSchema }), asyncHandler(async (req, res) => {
  const body = req.body as { input?: Record<string, unknown> };
  const result = await serviceRunAgent({ definitionId: param(req, "id"), input: body.input });
  res.status(201).json(result);
}));

agentsRouter.get("/definitions/:id/runs", asyncHandler(async (req, res) => {
  const runs = await getAgentRuns(param(req, "id"));
  res.json(runs);
}));

agentsRouter.post("/runs/:runId/approve", canWrite, validate({ body: z.object({ approved: z.boolean(), comment: z.string().optional() }) }), asyncHandler(async (req, res) => {
  const approval = await serviceApprove(
    param(req, "runId"),
    (req.body as { approved: boolean }).approved,
    req.user!.id,
    (req.body as { comment?: string }).comment,
  );
  res.json(approval);
}));
