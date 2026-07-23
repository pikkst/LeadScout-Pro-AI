// Phase 3 API service: signals, agents, marketplace.
import { api } from "./apiClient";
import type { Phase3AccountRank, Phase3Signal } from "../types";

export interface SignalPayload {
  id: string;
  type: string;
  source: string;
  evidence: string;
  confidence: number;
  isVerified: boolean;
  ingestedAt: string;
  verifiedAt?: string;
  accountSignals?: Array<{ accountId: string; relevance: number; freshness: number; context?: string }>;
}

export interface AccountSignalPayload {
  signalId: string;
  accountSignalId: string;
  relevance: number;
  freshness: number;
  context?: string;
}

export interface AgentDefinitionPayload {
  id: string;
  name: string;
  type: string;
  description: string;
  config: Record<string, unknown>;
  budget: number;
  spentBudget: number;
  permissions: Record<string, unknown>;
  approvalThreshold: number;
  isActive: boolean;
  createdById: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: { runs: number };
}

export interface AgentRunPayload {
  id: string;
  definitionId: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  cost: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  approvals: Array<{ id: string; status: string }>;
}

export interface PackPayload {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: string;
  vertical?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: Array<{ id: string; playbookId: string; sortOrder: number; playbook?: { id: string; name: string; type: string; status: string } }>;
  createdBy?: { id: string; name: string; email: string };
}

export async function listSignals(filters?: { accountId?: string; type?: string; isVerified?: boolean; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.accountId) params.set("accountId", filters.accountId);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.isVerified !== undefined) params.set("isVerified", String(filters.isVerified));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return api<SignalPayload[]>(`/signals${qs ? `?${qs}` : ""}`);
}

export async function ingestSignalSignal(payload: {
  type: string;
  source: string;
  evidence: string;
  confidence: number;
  rawPayload?: Record<string, unknown>;
  accountIds?: string[];
}): Promise<SignalPayload> {
  return api<SignalPayload>("/signals", { method: "POST", body: JSON.stringify(payload) });
}

export async function verifySignal(id: string, verified: boolean): Promise<SignalPayload> {
  return api<SignalPayload>(`/signals/${id}/verify`, { method: "POST", body: JSON.stringify({ verified }) });
}

export async function deleteSignal(id: string): Promise<{ ok: boolean }> {
  return api(`/signals/${id}`, { method: "DELETE" });
}

export async function getAccountSignals(accountId: string) {
  return api<SignalPayload[]>(`/signals/accounts/${accountId}`);
}

export async function addAccountSignal(accountId: string, payload: { relevance: number; freshness: number; context?: string }) {
  return api<AccountSignalPayload>(`/signals/accounts/${accountId}`, { method: "POST", body: JSON.stringify(payload) });
}

export async function listAgents() {
  return api<AgentDefinitionPayload[]>("/agents/definitions");
}

export async function createAgent(input: { name: string; type: string; description?: string; config?: Record<string, unknown>; budget?: number; permissions?: Record<string, unknown>; approvalThreshold?: number; isActive?: boolean }) {
  return api<AgentDefinitionPayload>("/agents/definitions", { method: "POST", body: JSON.stringify(input) });
}

export async function updateAgent(id: string, changes: { name?: string; description?: string; type?: string; config?: Record<string, unknown>; budget?: number; permissions?: Record<string, unknown>; approvalThreshold?: number; isActive?: boolean }) {
  return api<AgentDefinitionPayload>(`/agents/definitions/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deleteAgent(id: string) {
  return api(`/agents/definitions/${id}`, { method: "DELETE" });
}

export async function runAgent(definitionId: string, input?: Record<string, unknown>) {
  return api<AgentRunPayload>(`/agents/definitions/${definitionId}/run`, { method: "POST", body: JSON.stringify({ input }) });
}

export async function getAgentRuns(definitionId: string) {
  return api<AgentRunPayload[]>(`/agents/definitions/${definitionId}/runs`);
}

export async function approveRun(runId: string, approved: boolean, comment?: string) {
  return api<{ id: string; status: string }>(`/agents/runs/${runId}/approve`, { method: "POST", body: JSON.stringify({ approved, comment }) });
}

export async function listPacks(filters?: { visibility?: string; vertical?: string }) {
  const params = new URLSearchParams();
  if (filters?.visibility) params.set("visibility", filters.visibility);
  if (filters?.vertical) params.set("vertical", filters.vertical);
  const qs = params.toString();
  return api<PackPayload[]>(`/marketplace/packs${qs ? `?${qs}` : ""}`);
}

export async function listAccountRankings(filters?: { limit?: number; minScore?: number }) {
  const params = new URLSearchParams();
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.minScore) params.set("minScore", String(filters.minScore));
  const qs = params.toString();
  return api<Phase3AccountRank[]>(`/rankings${qs ? `?${qs}` : ""}`);
}

export async function createPack(payload: { name: string; slug: string; description?: string; visibility?: string; vertical?: string; playbookIds?: string[] }) {
  return api<PackPayload>("/marketplace/packs", { method: "POST", body: JSON.stringify(payload) });
}

export async function getPack(slug: string) {
  return api<PackPayload>(`/marketplace/packs/${encodeURIComponent(slug)}`);
}

export async function updatePack(slug: string, changes: { name?: string; description?: string; visibility?: string; vertical?: string }) {
  return api<PackPayload>(`/marketplace/packs/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function addPackItem(slug: string, playbookId: string, sortOrder?: number) {
  return api<{ id: string; packId: string; playbookId: string; sortOrder: number }>(`/marketplace/packs/${encodeURIComponent(slug)}/items`, { method: "POST", body: JSON.stringify({ playbookId, sortOrder }) });
}

export async function removePackItem(slug: string, playbookId: string) {
  return api(`/marketplace/packs/${encodeURIComponent(slug)}/items/${encodeURIComponent(playbookId)}`, { method: "DELETE" });
}

export async function deletePack(slug: string) {
  return api(`/marketplace/packs/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

export async function applyPack(slug: string, targetPlaybookIds?: string[]) {
  return api<{ applied: number; playbookIds: string[]; packName: string }>(`/marketplace/packs/${encodeURIComponent(slug)}/apply`, { method: "POST", body: JSON.stringify({ playbookIds: targetPlaybookIds }) });
}
