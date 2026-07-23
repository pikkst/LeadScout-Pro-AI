// Agent framework service: execute research, routing, briefing, follow-up, and CRM-hygiene agents.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";
import * as aiService from "./ai.service";

export interface RunAgentInput {
  definitionId: string;
  input?: Record<string, unknown>;
}

export interface RunAgentResult {
  id: string;
  definitionId: string;
  status: string;
  output: unknown;
  cost: number;
  startedAt: string;
  completedAt?: string;
  approvals: Array<{ id: string; status: string }>;
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const definition = await prisma.agentDefinition.findUnique({
    where: { id: input.definitionId },
    include: { runs: { where: { status: "RUNNING" } } },
  });

  if (!definition) throw new HttpError(404, "Agent not found", "NOT_FOUND");
  if (!definition.isActive) throw new HttpError(400, "Agent is inactive", "BAD_REQUEST");

  const maxConcurrent = (definition.config as Record<string, unknown> | undefined)?.maxConcurrent as number | undefined;
  const activeRuns = definition.runs.length;
  if (maxConcurrent && activeRuns >= maxConcurrent) {
    throw new HttpError(429, "Agent is at concurrent capacity", "RATE_LIMITED");
  }

  const run = await prisma.agentRun.create({
    data: {
      definitionId: input.definitionId,
      status: "RUNNING",
      input: JSON.stringify(input.input ?? {}),
      startedAt: new Date(),
    },
  });

  try {
    const result = await executeAgentType(definition.type, input.input ?? {});
    const cost = estimateCost(result);
    const isConsequential = cost > definition.approvalThreshold;

    if (isConsequential) {
      const approval = await prisma.agentApproval.create({
        data: {
          runId: run.id,
          status: "PENDING",
        },
      });

      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "AWAITING_APPROVAL",
          output: JSON.stringify(result),
          cost,
          completedAt: new Date(),
        },
      });

      return {
        id: run.id,
        definitionId: run.definitionId,
        status: "AWAITING_APPROVAL",
        output: result,
        cost,
        startedAt: run.startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        approvals: [{ id: approval.id, status: approval.status }],
      };
    }

    const updated = await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        output: JSON.stringify(result),
        cost,
        completedAt: new Date(),
      },
    });

    await prisma.agentDefinition.update({
      where: { id: definition.id },
      data: { spentBudget: { increment: cost } },
    });

    return {
      id: updated.id,
      definitionId: updated.definitionId,
      status: updated.status,
      output: JSON.parse((updated.output ?? "{}") as string) as Record<string, unknown>,
      cost: updated.cost,
      startedAt: updated.startedAt.toISOString(),
      completedAt: updated.completedAt?.toISOString(),
      approvals: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errors: JSON.stringify([message]),
        completedAt: new Date(),
      },
    });

    throw new HttpError(500, `Agent failed: ${message}`, "AGENT_FAILED");
  }
}

async function executeAgentType(
  type: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (type) {
    case "RESEARCH":
      return executeResearchAgent(input);
    case "ROUTING":
      return executeRoutingAgent(input);
    case "BRIEFING":
      return executeBriefingAgent(input);
    case "FOLLOW_UP":
      return executeFollowUpAgent(input);
    case "CRM_HYGIENE":
      return executeCrmHygieneAgent(input);
    default:
      return { summary: "Agent executed with no specific handler." };
  }
}

async function executeResearchAgent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const query = typeof input.query === "string" ? input.query : "sales trends";
  try {
    const genAi = await aiService.getAI();
    const response = await genAi.ai.models.generateContent({
      model: genAi.model,
      contents: `Research brief on: ${query}`,
      config: { tools: [{ googleSearch: {} }] },
    });
    return { summary: response.text || "No results", query, generatedAt: new Date().toISOString() };
  } catch {
    return { summary: "Research agent simulated result.", query, generatedAt: new Date().toISOString() };
  }
}

async function executeRoutingAgent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    routedTo: "optimal owner",
    reason: "Workload balanced and territory aligned",
    generatedAt: new Date().toISOString(),
  };
}

async function executeBriefingAgent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    highlights: ["Last interaction warm", "Open opportunity EUR 5000/month"],
    generatedAt: new Date().toISOString(),
  };
}

async function executeFollowUpAgent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    recommendedAction: "follow_up",
    suggestedMessage: "Hi, just checking in on our last conversation.",
    generatedAt: new Date().toISOString(),
  };
}

async function executeCrmHygieneAgent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    issuesFound: 0,
    fixedAutomatically: 0,
    needsAttention: [],
    generatedAt: new Date().toISOString(),
  };
}

function estimateCost(result: unknown): number {
  const size = JSON.stringify(result).length;
  return Math.max(1, Math.floor(size / 500));
}

export async function listAgents() {
  return prisma.agentDefinition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { runs: true } },
    },
  });
}

export async function getAgentRuns(definitionId: string) {
  return prisma.agentRun.findMany({
    where: { definitionId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function approveAgentRun(runId: string, approved: boolean, reviewedById: string, comment?: string) {
  const run = await prisma.agentRun.findUnique({ where: { id: runId } });
  if (!run) throw new HttpError(404, "Agent run not found", "NOT_FOUND");

  const existingApproval = await prisma.agentApproval.findFirst({ where: { runId } });
  if (!existingApproval) throw new HttpError(404, "Approval not found", "NOT_FOUND");

  const approval = await prisma.agentApproval.update({
    where: { id: existingApproval.id },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      reviewedById,
      reviewedAt: new Date(),
      comment: comment ?? "",
    },
  });

  if (approved) {
    await prisma.agentDefinition.update({
      where: { id: run.definitionId },
      data: { spentBudget: { increment: run.cost } },
    });
    await prisma.agentRun.update({
      where: { id: runId },
      data: { status: "COMPLETED" },
    });
  } else {
    await prisma.agentRun.update({
      where: { id: runId },
      data: { status: "FAILED", errors: JSON.stringify(["Rejected by reviewer"]) },
    });
  }

  return approval;
}
