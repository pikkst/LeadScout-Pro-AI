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
  const workspaceKey = req.user!.id;
  const { centerNodeType, centerNodeId, depth } = req.query as z.infer<typeof graphQuerySchema>;
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
  const workspaceKey = req.user!.id;
  const { nodeType, nodeId, title, metadata } = req.body as z.infer<typeof upsertNodeSchema>;
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
  const workspaceKey = req.user!.id;
  const { sourceType, sourceId, targetType, targetId, edgeType, weight, metadata } = req.body as z.infer<typeof createEdgeSchema>;
  const edge = await createGraphEdge(workspaceKey, sourceType, sourceId, targetType, targetId, edgeType, weight ?? 1, metadata ?? {});
  res.status(201).json(edge);
}));

graphRouter.post("/sync/account/:accountId", asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");
  const user = req.user!;
  const workspaceKey = user.id;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { contacts: true, opportunities: { where: { status: "OPEN" } }, relationships: true, conversations: true },
  });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const isAuthorized = user.role === "ADMIN" || user.role === "MANAGER" || account.ownerId === user.id;
  if (!isAuthorized) {
    return res.status(403).json({ error: "Unauthorized access to this account resource", code: "FORBIDDEN" });
  }

  const accountNode = await upsertGraphNode(workspaceKey, "ACCOUNT", account.id, account.name, { domain: account.domain, industry: account.industry });

  let successCount = 1;

  for (const contact of account.contacts) {
    try {
      await upsertGraphNode(workspaceKey, "CONTACT", contact.id, contact.fullName, { email: contact.email, title: contact.title });
      await createGraphEdge(workspaceKey, "ACCOUNT", account.id, "CONTACT", contact.id, "OWNS", 1, {});
      successCount += 1;
    } catch (err) {
      console.error(`[GraphSync] Failed to sync contact ${contact.id}:`, err);
    }
  }

  for (const opp of account.opportunities) {
    try {
      await upsertGraphNode(workspaceKey, "OPPORTUNITY", opp.id, opp.name, { value: opp.value, stage: opp.stage, status: opp.status });
      await createGraphEdge(workspaceKey, "ACCOUNT", account.id, "OPPORTUNITY", opp.id, "LEADS_TO", 1, {});
      if (opp.primaryContactId) {
        await createGraphEdge(workspaceKey, "CONTACT", opp.primaryContactId, "OPPORTUNITY", opp.id, "PART_OF", 1, {});
      }
      successCount += 1;
    } catch (err) {
      console.error(`[GraphSync] Failed to sync opportunity ${opp.id}:`, err);
    }
  }

  for (const rel of account.relationships) {
    try {
      await upsertGraphNode(workspaceKey, "RELATIONSHIP", rel.id, `${rel.type} - ${rel.status}`, { strength: rel.strength });
      await createGraphEdge(workspaceKey, "ACCOUNT", account.id, "RELATIONSHIP", rel.id, "PART_OF", 1, {});
      successCount += 1;
    } catch (err) {
      console.error(`[GraphSync] Failed to sync relationship ${rel.id}:`, err);
    }
  }

  await recordAutomationAudit({
    actionType: "CRM_UPDATE",
    entityType: "ACCOUNT",
    entityId: accountId,
    actorType: "USER",
    actorId: user.id,
    newState: { graphSynced: true, nodeCount: successCount },
  });

  res.json({ synced: true, nodeCount: successCount, root: accountNode });
}));
