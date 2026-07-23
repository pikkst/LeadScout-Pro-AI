// Workspace threshold service: solo-to-team auto-promotion configuration and logic.
import { prisma } from "../db";
import { HttpError } from "../utils/httpError";

export interface WorkspaceThresholdPayload {
  id: string;
  workspaceKey: string;
  soloMode: boolean;
  autoPromoteUsers: number;
  autoPromoteLeads: number;
  autoPromoteAutomation: number;
  currentUserCount: number;
  currentLeadCount: number;
  currentAutomationCount: number;
  promotedAt?: string;
  shouldPromote: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getOrCreateWorkspaceThreshold(workspaceKey: string, userId: string) {
  let threshold = await prisma.workspaceThreshold.findUnique({
    where: { workspaceKey },
  });
  if (!threshold) {
    threshold = await prisma.workspaceThreshold.create({
      data: { workspaceKey, id: userId },
    });
  }
  return serializeWorkspaceThreshold(threshold);
}

export async function updateWorkspaceThreshold(workspaceKey: string, data: {
  autoPromoteUsers?: number;
  autoPromoteLeads?: number;
  autoPromoteAutomation?: number;
  currentUserCount?: number;
  currentLeadCount?: number;
  currentAutomationCount?: number;
}) {
  const threshold = await prisma.workspaceThreshold.findUnique({
    where: { workspaceKey },
  });
  if (!threshold) throw new HttpError(404, "Workspace threshold not found", "NOT_FOUND");

  const updated = await prisma.workspaceThreshold.update({
    where: { workspaceKey },
    data: {
      ...data,
      soloMode: shouldRemainSoloMode(data.currentUserCount ?? threshold.currentUserCount, data.currentLeadCount ?? threshold.currentLeadCount, data.currentAutomationCount ?? threshold.currentAutomationCount, threshold.autoPromoteUsers, threshold.autoPromoteLeads, threshold.autoPromoteAutomation),
      promotedAt: shouldRemainSoloMode(data.currentUserCount ?? threshold.currentUserCount, data.currentLeadCount ?? threshold.currentLeadCount, data.currentAutomationCount ?? threshold.currentAutomationCount, threshold.autoPromoteUsers, threshold.autoPromoteLeads, threshold.autoPromoteAutomation) ? threshold.promotedAt : new Date(),
    },
  });

  return serializeWorkspaceThreshold(updated);
}

export async function evaluatePromotion(workspaceKey: string) {
  let threshold = await prisma.workspaceThreshold.findUnique({
    where: { workspaceKey },
  });
  if (!threshold) return { shouldPromote: false, soloMode: true };

  const shouldPromote = !shouldRemainSoloMode(threshold.currentUserCount, threshold.currentLeadCount, threshold.currentAutomationCount, threshold.autoPromoteUsers, threshold.autoPromoteLeads, threshold.autoPromoteAutomation);

  if (shouldPromote && threshold.soloMode) {
    threshold = await prisma.workspaceThreshold.update({
      where: { workspaceKey },
      data: { soloMode: false, promotedAt: new Date() },
    });
  }

  return {
    shouldPromote,
    soloMode: threshold.soloMode,
    thresholds: {
      users: threshold.autoPromoteUsers,
      leads: threshold.autoPromoteLeads,
      automation: threshold.autoPromoteAutomation,
    },
    current: {
      users: threshold.currentUserCount,
      leads: threshold.currentLeadCount,
      automation: threshold.currentAutomationCount,
    },
  };
}

function shouldRemainSoloMode(users: number, leads: number, automation: number, userThreshold: number, leadThreshold: number, automationThreshold: number) {
  return users < userThreshold && leads < leadThreshold && automation < automationThreshold;
}

function serializeWorkspaceThreshold(threshold: {
  id: string;
  workspaceKey: string;
  soloMode: boolean;
  autoPromoteUsers: number;
  autoPromoteLeads: number;
  autoPromoteAutomation: number;
  currentUserCount: number;
  currentLeadCount: number;
  currentAutomationCount: number;
  promotedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}): WorkspaceThresholdPayload {
  const shouldPromote = !shouldRemainSoloMode(threshold.currentUserCount, threshold.currentLeadCount, threshold.currentAutomationCount, threshold.autoPromoteUsers, threshold.autoPromoteLeads, threshold.autoPromoteAutomation);
  return {
    id: threshold.id,
    workspaceKey: threshold.workspaceKey,
    soloMode: threshold.soloMode,
    autoPromoteUsers: threshold.autoPromoteUsers,
    autoPromoteLeads: threshold.autoPromoteLeads,
    autoPromoteAutomation: threshold.autoPromoteAutomation,
    currentUserCount: threshold.currentUserCount,
    currentLeadCount: threshold.currentLeadCount,
    currentAutomationCount: threshold.currentAutomationCount,
    promotedAt: threshold.promotedAt?.toISOString(),
    shouldPromote,
    createdAt: threshold.createdAt.toISOString(),
    updatedAt: threshold.updatedAt.toISOString(),
  };
}
