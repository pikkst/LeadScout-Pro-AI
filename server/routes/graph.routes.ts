// Graph routes: unified outcome graph queries.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";
import { getOutcomeGraph, upsertGraphNode, createGraphEdge } from "../services/outcomeGraph.service";
import { recordAutomationAudit } from "../services/automationAudit.service";

export const graphRouter = Router();
graphRouter.use(requireAuth);

const graphQuerySchema = z.object({
  centerNodeType: z.string().optional(),
  centerNodeId: z.string().optional(),
  depth: z.coerce.number().int().min(1).max(3).default(2),
});

graphRouter.get("/", validate({ query: graphQuerySchema }), asyncHandler(async (req, res) => {
  const workspaceKey = (req as any).user.id;
  const { centerNodeType, centerNodeId, depth } = (req as any).query as z.infer<typeof graphQuerySchema>;
  const result = await getOutcomeGraph(workspaceKey, centerNodeType, centerNodeId, depth);
  res.json(result);
}));

const upsertNodeSchema = z.object({
  nodeType: z.string(),
  nodeId: z.string(),
  title: z.string(),
  metadata: z.record(z.any()).optional(),
});

graphRouter.post("/nodes", validate({ body: upsertNodeSchema }), asyncHandler(async (req, res) => {
  const workspaceKey = (req as any).user.id;
  const { nodeType, nodeId, title, metadata } = (req as any).body as z.infer<typeof upsertNodeSchema>;
  const node = await upsertGraphNode(workspaceKey, nodeType, nodeId, title, metadata ?? {});
  res.status(201).json(node);
}));

const createEdgeSchema = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  edgeType: z.string(),
  weight: z.coerce.number().optional(),
  metadata: z.record(z.any()).optional(),
});

graphRouter.post("/edges", validate({ body: createEdgeSchema }), asyncHandler(async (req, res) => {
  const workspaceKey = (req as any).user.id;
  const { sourceType, sourceId, targetType, targetId, edgeType, weight, metadata } = (req as any).body as z.infer<typeof createEdgeSchema>;
  const edge = await createGraphEdge(workspaceKey, sourceType, sourceId, targetType, targetId, edgeType, weight ?? 1, metadata ?? {});
  res.status(201).json(edge);
}));

graphRouter.post("/sync/account/:accountId", asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");
  const workspaceKey = (req as any).user.id;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { contacts: true, opportunities: { where: { status: "OPEN" } }, relationships: true, conversations: true },
  });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const accountNode = await upsertGraphNode(workspaceKey, "ACCOUNT", account.id, account.name, { domain: account.domain, industry: account.industry });

  for (const contact of account.contacts) {
    await upsertGraphNode(workspaceKey, "CONTACT", contact.id, contact.fullName, { email: contact.email, title: contact.title });
    await createGraphEdge(workspaceKey, "ACCOUNT", account.id, "CONTACT", contact.id, "OWNS", 1, {});
  }

  for (const opp of account.opportunities) {
    await upsertGraphNode(workspaceKey, "OPPORTUNITY", opp.id, opp.name, { value: opp.value, stage: opp.stage, status: opp.status });
    await createGraphEdge(workspaceKey, "ACCOUNT", account.id, "OPPORTUNITY", opp.id, "LEADS_TO", 1, {});
    if (opp.primaryContactId) {
      await createGraphEdge(workspaceKey, "CONTACT", opp.primaryContactId, "OPPORTUNITY", opp.id, "PART_OF", 1, {});
    }
  }

  for (const rel of account.relationships) {
    await upsertGraphNode(workspaceKey, "RELATIONSHIP", rel.id, `${rel.type} - ${rel.status}`, { strength: rel.strength });
    await createGraphEdge(workspaceKey, "ACCOUNT", account.id, "RELATIONSHIP", rel.id, "PART_OF", 1, {});
  }

  await recordAutomationAudit({
    actionType: "CRM_UPDATE",
    entityType: "ACCOUNT",
    entityId: accountId,
    actorType: "USER",
    actorId: (req as any).user.id,
    newState: { graphSynced: true, nodeCount: 1 + account.contacts.length + account.opportunities.length + account.relationships.length },
  });

  res.json({ synced: true, nodeCount: 1 + account.contacts.length + account.opportunities.length + account.relationships.length, root: accountNode });
}));
