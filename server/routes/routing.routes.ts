// Lead routing rules routes
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { param } from "../utils/param";

export const routingRouter = Router();
routingRouter.use(requireAuth);
const canWrite = requireRole("ADMIN", "MANAGER");

const routingRuleSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().default(true),
  priority: z.coerce.number().int().min(0).default(0),
  ruleType: z.enum(["TERRITORY", "INDUSTRY", "ROUND_ROBIN", "MANUAL", "SCORE_BASED"]),
  criteria: z.string().max(10000).default("{}").refine((value) => {
    try {
      const parsed = JSON.parse(value);
      return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, "Criteria must be a valid JSON object"),
  assignedAgentId: z.string(),
});

// ---- List routing rules ----
routingRouter.get("/rules", asyncHandler(async (req, res) => {
  const rules = await prisma.leadRoutingRule.findMany({
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
    orderBy: { priority: "desc" },
  });

  res.json(rules);
}));

// ---- Create routing rule ----
routingRouter.post("/rules", canWrite, asyncHandler(async (req, res) => {
  const data = routingRuleSchema.parse(req.body);

  const agent = await prisma.user.findUnique({ where: { id: data.assignedAgentId } });
  if (!agent) throw notFound("Agent not found");

  const rule = await prisma.leadRoutingRule.create({
    data: data as any,
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(rule);
}));

// ---- Update routing rule ----
routingRouter.put("/rules/:id", canWrite, asyncHandler(async (req, res) => {
  const data = routingRuleSchema.parse(req.body);

  const rule = await prisma.leadRoutingRule.findUnique({ where: { id: param(req, "id") } });
  if (!rule) throw notFound("Routing rule not found");

  const agent = await prisma.user.findUnique({ where: { id: data.assignedAgentId } });
  if (!agent) throw notFound("Agent not found");

  const updated = await prisma.leadRoutingRule.update({
    where: { id: param(req, "id") },
    data,
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(updated);
}));

// ---- Delete routing rule ----
routingRouter.delete("/rules/:id", canWrite, asyncHandler(async (req, res) => {
  await prisma.leadRoutingRule.delete({ where: { id: param(req, "id") } });
  res.json({ success: true });
}));

// ---- Auto-assign lead based on rules ----
routingRouter.post("/auto-assign/:leadId", canWrite, asyncHandler(async (req, res) => {
  const leadId = param(req, "leadId");

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw notFound("Lead not found");

  const activeRules = await prisma.leadRoutingRule.findMany({
    where: { isActive: true },
    include: { assignedAgent: true },
    orderBy: { priority: "desc" },
  });

  if (activeRules.length === 0) {
    return res.json({ message: "No active routing rules", assignedTo: null });
  }

  let matchedRule = null;

  for (const rule of activeRules) {
    const criteria = JSON.parse(rule.criteria || "{}");
    let matches = false;

    switch (rule.ruleType) {
      case "TERRITORY":
        matches = criteria.territory ? lead.focus === criteria.territory : false;
        break;
      case "INDUSTRY":
        matches = criteria.focus ? lead.category === criteria.focus : false;
        break;
      case "ROUND_ROBIN":
        const agentLeadCount = await prisma.lead.count({
          where: { assignedAgentId: rule.assignedAgentId },
        });
        matches = agentLeadCount < (criteria.maxLeads || 10);
        break;
      case "SCORE_BASED":
        const score = lead.estimatedValue || 0;
        matches = score >= (criteria.minValue || 0);
        break;
      default:
        matches = true;
    }

    if (matches) {
      matchedRule = rule;
      break;
    }
  }

  if (!matchedRule) {
    return res.json({ message: "No matching rule found", assignedTo: null });
  }

  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: { assignedAgentId: matchedRule.assignedAgentId },
    include: { assignedAgent: { select: { name: true } } },
  });

  res.json({
    message: `Lead assigned to ${matchedRule.assignedAgent.name}`,
    assignedTo: matchedRule.assignedAgent.name,
    lead: updatedLead,
  });
}));
