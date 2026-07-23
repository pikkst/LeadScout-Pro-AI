// CRM service: persist and manage leads, pitches, follow-ups and meetings server-side.
import { CompanyLead, OutreachPitch, ScheduledMeeting, FollowUpSequence, SequenceExecution, StagePrediction, AiForecast, MeetingPrep, SendTimeRecord, CoachingInsight, MonitoringAlert } from "../types";
import { api } from "./apiClient";

type Stage = NonNullable<CompanyLead["stage"]>;

// ---- Leads ----
export interface LeadFilters {
  stage?: Stage;
  focus?: string;
  mine?: boolean;
  search?: string;
}

export async function listLeads(filters: LeadFilters = {}): Promise<CompanyLead[]> {
  const params = new URLSearchParams();
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.focus) params.set("focus", filters.focus);
  if (filters.mine) params.set("mine", "true");
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return api<CompanyLead[]>(`/leads${qs ? `?${qs}` : ""}`);
}

export async function createLead(lead: Partial<CompanyLead> & { focus?: string }): Promise<CompanyLead> {
  return api<CompanyLead>("/leads", { method: "POST", body: JSON.stringify(lead) });
}

export interface ImportResult {
  created: CompanyLead[];
  skipped: Array<{ name: string; website: string; email: string; reason: string }>;
  imported: number;
  skippedCount: number;
}

export async function importLeads(
  leads: Array<Partial<CompanyLead> & { focus?: string }>,
): Promise<ImportResult> {
  return api<ImportResult>("/leads/bulk", { method: "POST", body: JSON.stringify({ leads }) });
}

export async function updateLead(id: string, changes: Partial<CompanyLead>): Promise<CompanyLead> {
  return api<CompanyLead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function updateLeadStage(id: string, stage: Stage): Promise<CompanyLead> {
  return api<CompanyLead>(`/leads/${id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) });
}

export async function assignLead(id: string, assignedAgentId: string | null): Promise<CompanyLead> {
  return api<CompanyLead>(`/leads/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assignedAgentId }),
  });
}

export async function bulkAssignLeads(leadIds: string[], assignedAgentId: string | null): Promise<{ updated: number }> {
  return api<{ updated: number }>("/leads/bulk/assign", { method: "POST", body: JSON.stringify({ leadIds, assignedAgentId }) });
}

export async function deleteLead(id: string): Promise<void> {
  await api(`/leads/${id}`, { method: "DELETE" });
}

export async function setFollowUpTask(
  id: string,
  task: { taskName: string; dueDate: string; isCompleted?: boolean; notes?: string },
): Promise<CompanyLead> {
  return api<CompanyLead>(`/leads/${id}/follow-up`, { method: "PUT", body: JSON.stringify(task) });
}

export async function clearFollowUpTask(id: string): Promise<CompanyLead> {
  return api<CompanyLead>(`/leads/${id}/follow-up`, { method: "DELETE" });
}

export async function addMeeting(
  id: string,
  meeting: Omit<ScheduledMeeting, "id">,
): Promise<ScheduledMeeting> {
  return api<ScheduledMeeting>(`/leads/${id}/meetings`, {
    method: "POST",
    body: JSON.stringify(meeting),
  });
}

export async function deleteMeeting(leadId: string, meetingId: string): Promise<void> {
  await api(`/leads/${leadId}/meetings/${meetingId}`, { method: "DELETE" });
}

// ---- Pitches ----
export async function listPitches(): Promise<OutreachPitch[]> {
  return api<OutreachPitch[]>("/pitches");
}

export async function generateAndSavePitch(
  leadId: string,
  focus: string,
  preferredLanguage: string,
  templateId?: string | null,
): Promise<OutreachPitch> {
  return api<OutreachPitch>("/pitches/generate", { method: "POST", body: JSON.stringify({ leadId, focus, preferredLanguage, templateId }) });
}

export async function updatePitch(
  id: string,
  changes: Partial<Pick<OutreachPitch, "subject" | "htmlContent" | "textContent" | "status" | "opened">>,
): Promise<OutreachPitch> {
  return api<OutreachPitch>(`/pitches/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function sendPitch(id: string): Promise<OutreachPitch> {
  return api<OutreachPitch>(`/pitches/${id}/send`, { method: "POST" });
}

export async function schedulePitch(id: string): Promise<OutreachPitch> {
  return api<OutreachPitch>(`/pitches/${id}/schedule`, { method: "POST" });
}

export async function deletePitch(id: string): Promise<void> {
  await api(`/pitches/${id}`, { method: "DELETE" });
}

export async function fetchPitchEvents(pitchId: string): Promise<PitchEvent[]> {
  return api<PitchEvent[]>(`/events/pitch/${pitchId}`);
}

// ---- Custom Fields ----
export async function listCustomFields(): Promise<CustomFieldDefinition[]> {
  return api<CustomFieldDefinition[]>("/custom-fields");
}

export async function createCustomField(field: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
  return api<CustomFieldDefinition>("/custom-fields", { method: "POST", body: JSON.stringify(field) });
}

export async function updateCustomField(id: string, changes: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
  return api<CustomFieldDefinition>(`/custom-fields/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deleteCustomField(id: string): Promise<void> {
  await api(`/custom-fields/${id}`, { method: "DELETE" });
}

export async function getLeadCustomFields(leadId: string): Promise<any[]> {
  return api<any[]>(`/leads/${leadId}/custom-fields`);
}

export async function setLeadCustomFields(leadId: string, values: Array<{ fieldId: string; value: string }>): Promise<any[]> {
  return api<any[]>(`/leads/${leadId}/custom-fields`, { method: "PUT", body: JSON.stringify(values) });
}

// ---- Deal Stages ----
export async function listDealStages(): Promise<DealStage[]> {
  return api<DealStage[]>("/custom-fields/stages");
}

export async function createDealStage(stage: Partial<DealStage>): Promise<DealStage> {
  return api<DealStage>("/custom-fields/stages", { method: "POST", body: JSON.stringify(stage) });
}

export async function updateDealStage(id: string, changes: Partial<DealStage>): Promise<DealStage> {
  return api<DealStage>(`/custom-fields/stages/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deleteDealStage(id: string): Promise<void> {
  await api(`/custom-fields/stages/${id}`, { method: "DELETE" });
}

// ---- Follow-up Sequences ----
export async function listSequences(): Promise<FollowUpSequence[]> {
  return api<FollowUpSequence[]>("/sequences");
}

export async function createSequence(sequence: Partial<FollowUpSequence>): Promise<FollowUpSequence> {
  return api<FollowUpSequence>("/sequences", { method: "POST", body: JSON.stringify(sequence) });
}

export async function updateSequence(id: string, changes: Partial<FollowUpSequence>): Promise<FollowUpSequence> {
  return api<FollowUpSequence>(`/sequences/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deleteSequence(id: string): Promise<void> {
  await api(`/sequences/${id}`, { method: "DELETE" });
}

export async function startSequence(sequenceId: string, leadId: string): Promise<SequenceExecution> {
  return api<SequenceExecution>(`/sequences/${sequenceId}/start/${leadId}`, { method: "POST" });
}

export async function stopSequence(sequenceId: string, leadId: string): Promise<SequenceExecution> {
  return api<SequenceExecution>(`/sequences/${sequenceId}/stop/${leadId}`, { method: "POST" });
}

export async function getLeadSequences(leadId: string): Promise<SequenceExecution[]> {
  return api<SequenceExecution[]>(`/sequences/lead/${leadId}`);
}

// ---- AI Intelligence ----
export async function calculateLeadAiScore(leadId: string): Promise<CompanyLead> {
  return api<CompanyLead>(`/ai/score/${leadId}`, { method: "POST" });
}

export async function enrichLeadData(leadId: string): Promise<CompanyLead> {
  return api<CompanyLead>(`/ai/enrich/${leadId}`, { method: "POST" });
}

export async function predictLeadStage(leadId: string): Promise<StagePrediction> {
  return api<StagePrediction>(`/ai/predict/${leadId}`, { method: "POST" });
}

export async function fetchAiForecast(): Promise<AiForecast> {
  return api<AiForecast>("/stats/forecast/ai");
}

export async function generateMeetingPrep(meetingId: string): Promise<MeetingPrep> {
  return api<MeetingPrep>(`/ai/meeting-prep/${meetingId}`, { method: "POST" });
}

// ---- Optimization ----
export async function recommendSendTime(leadId: string, agentId?: string): Promise<SendTimeRecord> {
  return api<SendTimeRecord>(`/optimization/send-time/${leadId}`, { method: "POST", body: JSON.stringify({ agentId: agentId || null }) });
}

export async function getSendTimeRecommendations(leadId: string): Promise<SendTimeRecord[]> {
  return api<SendTimeRecord[]>(`/optimization/send-time/${leadId}`);
}

export async function generateCoachingInsights(): Promise<CoachingInsight[]> {
  return api<CoachingInsight[]>("/optimization/coaching/generate", { method: "POST" });
}

export async function getMyCoachingInsights(): Promise<CoachingInsight[]> {
  return api<CoachingInsight[]>("/optimization/coaching/me");
}

export async function markCoachingRead(id: string): Promise<CoachingInsight> {
  return api<CoachingInsight>(`/optimization/coaching/${id}/read`, { method: "PATCH" });
}

export async function resolveCoaching(id: string): Promise<CoachingInsight> {
  return api<CoachingInsight>(`/optimization/coaching/${id}/resolve`, { method: "PATCH" });
}

export async function checkLeadMonitoring(leadId: string): Promise<MonitoringAlert[]> {
  return api<MonitoringAlert[]>(`/monitoring/lead/${leadId}/check`, { method: "POST" });
}

export async function getLeadMonitoring(leadId: string): Promise<MonitoringAlert[]> {
  return api<MonitoringAlert[]>(`/monitoring/lead/${leadId}`);
}

// ---- Stats ----
export interface CrmStats {
  totalLeads: number;
  totalPitches: number;
  sentPitches: number;
  repliedPitches: number;
  pipelineValueEUR: number;
  byStage: Record<string, number>;
  byFocus: Record<string, number>;
}

export async function fetchStats(): Promise<CrmStats> {
  return api<CrmStats>("/stats");
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  return api<ActivityItem[]>("/stats/activity");
}

// ---- Pitch Templates ----
export async function listTemplates(): Promise<PitchTemplate[]> {
  return api<PitchTemplate[]>("/templates");
}

export async function createTemplate(template: Partial<PitchTemplate>): Promise<PitchTemplate> {
  return api<PitchTemplate>("/templates", { method: "POST", body: JSON.stringify(template) });
}

export async function updateTemplate(id: string, changes: Partial<PitchTemplate>): Promise<PitchTemplate> {
  return api<PitchTemplate>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deleteTemplate(id: string): Promise<void> {
  await api(`/templates/${id}`, { method: "DELETE" });
}

// ---- Types ----
export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  user: string;
  lead: string | null;
  createdAt: string;
}

export interface PitchTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  focus?: string;
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PitchEvent {
  id: string;
  pitchId: string;
  type: 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'FAILED';
  createdAt: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';
  options?: string;
  isRequired?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealStage {
  id: string;
  name: string;
  key: string;
  color: string;
  sortOrder?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---- Relationships ----
export interface RelationshipAccount {
  id: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  description?: string;
  ownerId?: string | null;
  contacts?: RelationshipContact[];
  opportunities?: RelationshipOpportunity[];
  relationships?: RelationshipRecord[];
  legacyLeads?: Array<{ id: string; stage: string; assignedAgentId: string | null }>;
  conversations?: any[];
  timelineEntries?: any[];
}

export interface RelationshipContact {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  consentStatus?: string;
  consentSource?: string | null;
}

export interface RelationshipOpportunity {
  id: string;
  name: string;
  stage: string;
  status: string;
  value: number;
  currency: string;
  probability: number;
  expectedCloseAt?: string | null;
}

export interface RelationshipRecord {
  id: string;
  type: string;
  status: string;
  strength: number;
  lastInteractionAt?: string | null;
  nextActionAt?: string | null;
  owner?: { id: string; name: string; email: string };
}

export interface RelationshipGraph {
  lead: any;
  account: RelationshipAccount;
  contact: RelationshipContact;
  opportunity: RelationshipOpportunity;
  relationship: RelationshipRecord;
  timeline: UnifiedTimelineItem[];
}

export interface UnifiedTimelineItem {
  id: string;
  type: string;
  title: string;
  body: string;
  occurredAt: string;
  sourceType: string;
  sourceId: string;
  metadata?: unknown;
}

export async function listRelationshipRecordsApi(search?: string): Promise<RelationshipAccount[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return api<RelationshipAccount[]>(`/relationships${qs}`);
}

export async function getRelationshipGraph(leadId: string): Promise<RelationshipGraph> {
  return api<RelationshipGraph>(`/relationships/lead/${encodeURIComponent(leadId)}`);
}

export async function getRelationshipTimeline(leadId: string): Promise<UnifiedTimelineItem[]> {
  return api<UnifiedTimelineItem[]>(`/relationships/lead/${encodeURIComponent(leadId)}/timeline`);
}

export async function addRelationshipNoteApi(leadId: string, body: string): Promise<any> {
  return api(`/relationships/lead/${encodeURIComponent(leadId)}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function createRelationshipAccount(data: {
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  description?: string;
}): Promise<RelationshipAccount> {
  return api<RelationshipAccount>("/relationships/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createRelationshipContact(accountId: string, data: {
  fullName: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  consentStatus?: string;
  consentSource?: string | null;
}): Promise<RelationshipContact> {
  return api<RelationshipContact>(`/relationships/accounts/${encodeURIComponent(accountId)}/contacts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createRelationshipOpportunity(accountId: string, data: {
  name: string;
  stage?: string;
  status?: string;
  value?: number;
  currency?: string;
  probability?: number;
  primaryContactId?: string | null;
  expectedCloseAt?: string | null;
}): Promise<RelationshipOpportunity> {
  return api<RelationshipOpportunity>(`/relationships/accounts/${encodeURIComponent(accountId)}/opportunities`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRelationshipOpportunity(id: string, data: Partial<RelationshipOpportunity>): Promise<RelationshipOpportunity> {
  return api<RelationshipOpportunity>(`/relationships/opportunities/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteRelationshipOpportunity(id: string): Promise<void> {
  await api(`/relationships/opportunities/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function updateRelationshipAccount(id: string, data: Partial<RelationshipAccount>): Promise<RelationshipAccount> {
  return api<RelationshipAccount>(`/relationships/accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateRelationshipContact(id: string, data: Partial<RelationshipContact>): Promise<RelationshipContact> {
  return api<RelationshipContact>(`/relationships/contacts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteRelationshipContact(id: string): Promise<void> {
  await api(`/relationships/contacts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createRelationship(accountId: string, data: {
  type?: string;
  status?: string;
  strength?: number;
  nextActionAt?: string | null;
}): Promise<RelationshipRecord> {
  return api<RelationshipRecord>(`/relationships/accounts/${encodeURIComponent(accountId)}/relationships`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRelationship(id: string, data: Partial<RelationshipRecord>): Promise<RelationshipRecord> {
  return api<RelationshipRecord>(`/relationships/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface ConversationMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  senderEmail: string;
  recipientEmails: string[];
  subject: string;
  textBody: string;
  occurredAt: string;
  isRead: boolean;
  intent?: string;
  sentiment?: string;
}

export interface ConnectionInfo {
  provider: string;
  accountEmail: string;
}

export interface Conversation {
  id: string;
  subject: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  summary?: string;
  suggestedReply?: string;
  messages: ConversationMessage[];
  connection?: ConnectionInfo;
}

export async function listConversationsApi(leadId?: string): Promise<Conversation[]> {
  const qs = leadId ? `?leadId=${encodeURIComponent(leadId)}` : "";
  return api<Conversation[]>(`/conversations${qs}`);
}

export async function getConversationApi(id: string): Promise<Conversation> {
  return api<Conversation>(`/conversations/${encodeURIComponent(id)}`);
}

export async function markConversationReadApi(id: string): Promise<void> {
  await api(`/conversations/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export async function syncConversationsApi(): Promise<{ synced: number }> {
  return api<{ synced: number }>("/conversations/sync", { method: "POST" });
}

export async function startGoogleOAuth(): Promise<{ authorizeUrl: string }> {
  return api<{ authorizeUrl: string }>("/google/oauth/start");
}

export async function disconnectGoogleApi(): Promise<void> {
  await api("/google/disconnect", { method: "POST" });
}

export async function sendGmailReplyApi(payload: { to: string; subject: string; body: string; threadId?: string }): Promise<{ id: string; threadId?: string }> {
  return api<{ id: string; threadId?: string }>("/google/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function stopSequencesForLead(leadId: string, event: string): Promise<void> {
  await api(`/pitches/stop-sequences`, { method: "POST", body: JSON.stringify({ leadId, event }) });
}

// ---- Playbooks ----
export async function listPlaybooks(): Promise<import("../types").Playbook[]> {
  return api<import("../types").Playbook[]>("/playbooks");
}

export async function createPlaybook(playbook: Partial<import("../types").Playbook>): Promise<import("../types").Playbook> {
  return api<import("../types").Playbook>("/playbooks", { method: "POST", body: JSON.stringify(playbook) });
}

export async function updatePlaybook(id: string, changes: Partial<import("../types").Playbook>): Promise<import("../types").Playbook> {
  return api<import("../types").Playbook>(`/playbooks/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deletePlaybook(id: string): Promise<void> {
  await api(`/playbooks/${id}`, { method: "DELETE" });
}

export async function getPlaybookVersions(playbookId: string): Promise<import("../types").PlaybookVersion[]> {
  return api<import("../types").PlaybookVersion[]>(`/playbooks/${playbookId}/versions`);
}

export async function createPlaybookVersion(playbookId: string, version: { changelog?: string; steps: import("../types").PlaybookStep[]; conditions?: import("../types").PlaybookCondition[]; actions?: import("../types").PlaybookAction[]; branches?: import("../types").PlaybookBranch[] }): Promise<import("../types").PlaybookVersion> {
  return api<import("../types").PlaybookVersion>(`/playbooks/${playbookId}/versions`, { method: "POST", body: JSON.stringify(version) });
}

export async function publishPlaybookVersion(playbookId: string, versionId: string): Promise<import("../types").PlaybookVersion> {
  return api<import("../types").PlaybookVersion>(`/playbooks/${playbookId}/versions/${versionId}/publish`, { method: "POST" });
}

export async function rollbackPlaybookVersion(playbookId: string, versionId: string): Promise<import("../types").PlaybookVersion> {
  return api<import("../types").PlaybookVersion>(`/playbooks/${playbookId}/versions/${versionId}/rollback`, { method: "POST" });
}

export async function startPlaybookTest(playbookId: string, versionId: string): Promise<import("../types").PlaybookTestRun> {
  return api<import("../types").PlaybookTestRun>(`/playbooks/${playbookId}/versions/${versionId}/test`, { method: "POST" });
}

export async function updatePlaybookTestRun(playbookId: string, versionId: string, runId: string, data: { status?: string; executionLog?: unknown[]; error?: string }): Promise<import("../types").PlaybookTestRun> {
  return api<import("../types").PlaybookTestRun>(`/playbooks/${playbookId}/versions/${versionId}/test-runs/${runId}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function approvePlaybookVersion(playbookId: string, versionId: string, comment?: string): Promise<import("../types").PlaybookApproval> {
  return api<import("../types").PlaybookApproval>(`/playbooks/${playbookId}/versions/${versionId}/approve`, { method: "POST", body: JSON.stringify({ comment }) });
}

export async function rejectPlaybookVersion(playbookId: string, versionId: string, comment: string): Promise<import("../types").PlaybookApproval> {
  return api<import("../types").PlaybookApproval>(`/playbooks/${playbookId}/versions/${versionId}/reject`, { method: "POST", body: JSON.stringify({ comment }) });
}

// ---- Qualification ----
export async function listQualificationPlaybooks(): Promise<import("../types").QualificationPlaybook[]> {
  return api<import("../types").QualificationPlaybook[]>("/qualification/playbooks");
}

export async function createQualificationPlaybook(playbook: Partial<import("../types").QualificationPlaybook>): Promise<import("../types").QualificationPlaybook> {
  return api<import("../types").QualificationPlaybook>("/qualification/playbooks", { method: "POST", body: JSON.stringify(playbook) });
}

export async function deleteQualificationPlaybook(id: string): Promise<void> {
  await api(`/qualification/playbooks/${id}`, { method: "DELETE" });
}

export async function getDealQualifications(dealId: string): Promise<import("../types").DealQualification[]> {
  return api<import("../types").DealQualification[]>(`/qualification/deals/${dealId}`);
}

export async function upsertDealQualification(dealId: string, data: { stageId: string; evidence?: string; isMet?: boolean }): Promise<import("../types").DealQualification> {
  return api<import("../types").DealQualification>(`/qualification/deals/${dealId}`, { method: "POST", body: JSON.stringify(data) });
}

// ---- Queues ----
export async function listDealQueues(): Promise<import("../types").DealQueue[]> {
  return api<import("../types").DealQueue[]>("/queues/queues");
}

export async function createDealQueue(queue: Partial<import("../types").DealQueue>): Promise<import("../types").DealQueue> {
  return api<import("../types").DealQueue>("/queues/queues", { method: "POST", body: JSON.stringify(queue) });
}

export async function listQueueItems(filters: { queueId?: string; status?: string; assigneeId?: string } = {}): Promise<import("../types").QueueItem[]> {
  const params = new URLSearchParams();
  if (filters.queueId) params.set("queueId", filters.queueId);
  if (filters.status) params.set("status", filters.status);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  const qs = params.toString();
  return api<import("../types").QueueItem[]>(`/queues/items${qs ? `?${qs}` : ""}`);
}

export async function createQueueItem(item: Partial<import("../types").QueueItem>): Promise<import("../types").QueueItem> {
  return api<import("../types").QueueItem>("/queues/items", { method: "POST", body: JSON.stringify(item) });
}

export async function updateQueueItem(itemId: string, changes: Partial<import("../types").QueueItem>): Promise<import("../types").QueueItem> {
  return api<import("../types").QueueItem>(`/queues/items/${itemId}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function getMyWorkloadCap(): Promise<import("../types").WorkloadCap> {
  return api<import("../types").WorkloadCap>("/queues/workload/me");
}

// ---- Attribution ----
export async function recordAttribution(data: { outcome: string; outcomeValue?: number; metadata?: Record<string, unknown>; accountId?: string; contactId?: string; opportunityId?: string; leadId?: string; pitchId?: string; stepId?: string }): Promise<import("../types").PlaybookAttribution> {
  return api<import("../types").PlaybookAttribution>("/attribution", { method: "POST", body: JSON.stringify(data) });
}

export async function getPlaybookAttributions(playbookId: string): Promise<{ attributions: import("../types").PlaybookAttribution[]; summary: { total: number; byOutcome: Record<string, number>; revenue: number } }> {
  return api(`/attribution/playbook/${playbookId}`);
}

// ---- Webhooks ----
export async function listOutboundWebhooks(): Promise<import("../types").OutboundWebhook[]> {
  return api<import("../types").OutboundWebhook[]>("/webhooks/webhooks");
}

export async function createOutboundWebhook(webhook: Partial<import("../types").OutboundWebhook>): Promise<import("../types").OutboundWebhook> {
  return api<import("../types").OutboundWebhook>("/webhooks/webhooks", { method: "POST", body: JSON.stringify(webhook) });
}

export async function listIntegrationMappings(): Promise<import("../types").IntegrationMapping[]> {
  return api<import("../types").IntegrationMapping[]>("/webhooks/mappings");
}

export async function createIntegrationMapping(mapping: Partial<import("../types").IntegrationMapping>): Promise<import("../types").IntegrationMapping> {
  return api<import("../types").IntegrationMapping>("/webhooks/mappings", { method: "POST", body: JSON.stringify(mapping) });
}
