// Automation audit routes: inspect automated actions before and after execution.
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getAutomationAuditLogs } from "../services/automationAudit.service";

export const automationAuditRouter = Router();
automationAuditRouter.use(requireAuth);

const toSingle = (v: string | string[] | undefined): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v;
};

automationAuditRouter.get("/", asyncHandler(async (req, res) => {
  const q = req.query as Record<string, string | string[] | undefined>;
  const limitStr = toSingle(q.limit);
  const logs = await getAutomationAuditLogs({
    entityType: toSingle(q.entityType),
    entityId: toSingle(q.entityId),
    actorType: toSingle(q.actorType),
    actorId: toSingle(q.actorId),
    limit: limitStr ? parseInt(limitStr, 10) : undefined,
  });
  res.json(logs);
}));

const entityParamSchema = z.object({
  entityType: z.enum(["SEQUENCE_EXECUTION", "PITCH", "LEAD", "OPPORTUNITY", "MEETING", "AGENT_RUN", "PLAYBOOK_VERSION", "ACCOUNT", "EVIDENCE_REVIEW"]),
  entityId: z.string().min(1),
});

automationAuditRouter.get("/entity/:entityType/:entityId", validate({ params: entityParamSchema }), asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params as { entityType: string; entityId: string };
  const logs = await getAutomationAuditLogs({ entityType, entityId, limit: 50 });
  res.json(logs);
}));
