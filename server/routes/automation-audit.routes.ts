// Automation audit routes: inspect automated actions before and after execution.
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { getAutomationAuditLogs } from "../services/automationAudit.service";

export const automationAuditRouter = Router();
automationAuditRouter.use(requireAuth);

automationAuditRouter.get("/", asyncHandler(async (req, res) => {
  const q = req.query as Record<string, string | string[] | undefined>;
  const toSingle = (v: string | string[] | undefined): string | undefined => {
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const logs = await getAutomationAuditLogs({
    entityType: toSingle(q.entityType),
    entityId: toSingle(q.entityId),
    actorType: toSingle(q.actorType),
    actorId: toSingle(q.actorId),
    limit: q.limit ? parseInt(toSingle(q.limit)!, 10) : undefined,
  });
  res.json(logs);
}));

automationAuditRouter.get("/entity/:entityType/:entityId", asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const logs = await getAutomationAuditLogs({ entityType: entityType as string, entityId: entityId as string, limit: 50 });
  res.json(logs);
}));
