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
