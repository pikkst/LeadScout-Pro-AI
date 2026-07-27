// Automation audit service: full audit trail for automated actions.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";
import type { JsonValue } from "@prisma/client/runtime/library";

export interface AutomationAuditInput {
  actionType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  budgetUsed?: number;
  tokenUsed?: number;
  approvalId?: string;
  error?: string;
  executedAt?: Date;
}

export async function recordAutomationAudit(input: AutomationAuditInput) {
  return prisma.automationAuditLog.create({
    data: {
      actionType: input.actionType as any,
      entityType: input.entityType as any,
      entityId: input.entityId,
      actorType: input.actorType as any,
      actorId: input.actorId,
      previousState: input.previousState ? JSON.stringify(input.previousState) as any : undefined,
      newState: input.newState ? JSON.stringify(input.newState) as any : undefined,
      budgetUsed: input.budgetUsed ?? 0,
      tokenUsed: input.tokenUsed ?? 0,
      approvalId: input.approvalId,
      error: input.error,
      executedAt: input.executedAt,
    },
  });
}

export async function getAutomationAuditLogs(filters?: { entityType?: string; entityId?: string; actorType?: string; actorId?: string; limit?: number }) {
  const where: Record<string, unknown> = {};
  if (filters?.entityType) where.entityType = filters.entityType as any;
  if (filters?.entityId) where.entityId = filters.entityId;
  if (filters?.actorType) where.actorType = filters.actorType as any;
  if (filters?.actorId) where.actorId = filters.actorId;

  const logs = await prisma.automationAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
  });

  return logs.map((log) => ({
    id: log.id,
    actionType: log.actionType,
    entityType: log.entityType,
    entityId: log.entityId,
    actorType: log.actorType,
    actorId: log.actorId,
    previousState: parseState(log.previousState),
    newState: parseState(log.newState),
    budgetUsed: log.budgetUsed,
    tokenUsed: log.tokenUsed,
    approvalId: log.approvalId ?? undefined,
    error: log.error ?? undefined,
    executedAt: log.executedAt?.toISOString(),
    createdAt: log.createdAt.toISOString(),
  }));
}

function parseState(value: JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
