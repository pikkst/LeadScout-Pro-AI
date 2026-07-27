// Phase 4 API service: outcome graph, evidence review, automation audit, workspace thresholds.
import { api } from "./apiClient";
import type { Phase4GraphNode, Phase4GraphEdge, Phase4EvidenceReview, Phase4AutomationAuditLog, Phase4WorkspaceThreshold, Phase4AccountRank } from "../types";

export async function getOutcomeGraph(filters?: { centerNodeType?: string; centerNodeId?: string; depth?: number }) {
  const params = new URLSearchParams();
  if (filters?.centerNodeType) params.set("centerNodeType", filters.centerNodeType);
  if (filters?.centerNodeId) params.set("centerNodeId", filters.centerNodeId);
  if (filters?.depth) params.set("depth", String(filters.depth));
  return api<{ nodes: Phase4GraphNode[]; edges: Phase4GraphEdge[] }>(`/graph?${params.toString()}`);
}

export async function syncAccountGraph(accountId: string) {
  return api<{ synced: boolean; nodeCount: number; root: Phase4GraphNode }>(`/graph/sync/account/${encodeURIComponent(accountId)}`, { method: "POST" });
}

export async function createGraphNode(payload: { nodeType: string; nodeId: string; title: string; metadata?: Record<string, unknown> }) {
  return api<Phase4GraphNode>("/graph/nodes", { method: "POST", body: JSON.stringify(payload) });
}

export async function createGraphEdge(payload: { sourceType: string; sourceId: string; targetType: string; targetId: string; edgeType: string; weight?: number; metadata?: Record<string, unknown> }) {
  return api<Phase4GraphEdge>("/graph/edges", { method: "POST", body: JSON.stringify(payload) });
}

export async function createEvidenceReview(payload: { entityType: string; entityId: string; recommendation: string; sources: unknown[]; confidence: number; freshness?: number }) {
  return api<Phase4EvidenceReview>("/evidence", { method: "POST", body: JSON.stringify(payload) });
}

export async function listEvidenceReviews(filters?: { entityType?: string; entityId?: string; status?: string; createdById?: string }) {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.entityId) params.set("entityId", filters.entityId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.createdById) params.set("createdById", filters.createdById);
  return api<Phase4EvidenceReview[]>(`/evidence?${params.toString()}`);
}

export async function approveEvidenceReview(id: string, comment?: string) {
  return api<Phase4EvidenceReview>(`/evidence/${id}/approve`, { method: "PATCH", body: JSON.stringify({ comment }) });
}

export async function rejectEvidenceReview(id: string, comment?: string) {
  return api<Phase4EvidenceReview>(`/evidence/${id}/reject`, { method: "PATCH", body: JSON.stringify({ comment }) });
}

export async function getAutomationAuditLogs(filters?: { entityType?: string; entityId?: string; actorType?: string; actorId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.entityId) params.set("entityId", filters.entityId);
  if (filters?.actorType) params.set("actorType", filters.actorType);
  if (filters?.actorId) params.set("actorId", filters.actorId);
  if (filters?.limit) params.set("limit", String(filters.limit));
  return api<Phase4AutomationAuditLog[]>(`/automation-audit?${params.toString()}`);
}

export async function getWorkspaceThreshold() {
  return api<Phase4WorkspaceThreshold>("/workspace-thresholds");
}

export async function updateWorkspaceThreshold(payload: { autoPromoteUsers?: number; autoPromoteLeads?: number; autoPromoteAutomation?: number; currentUserCount?: number; currentLeadCount?: number; currentAutomationCount?: number }) {
  return api<Phase4WorkspaceThreshold>("/workspace-thresholds", { method: "PUT", body: JSON.stringify(payload) });
}

export async function evaluateWorkspacePromotion() {
  return api<{ shouldPromote: boolean; soloMode: boolean; thresholds: Record<string, number>; current: Record<string, number> }>("/workspace-thresholds/evaluate");
}

export async function listAccountRankings(filters?: { limit?: number; minScore?: number }) {
  const params = new URLSearchParams();
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.minScore) params.set("minScore", String(filters.minScore));
  return api<Phase4AccountRank[]>(`/rankings${params.toString() ? `?${params.toString()}` : ""}`);
}
