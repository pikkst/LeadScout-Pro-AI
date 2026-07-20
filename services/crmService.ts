// CRM service: persist and manage leads, pitches, follow-ups and meetings server-side.
import { CompanyLead, OutreachPitch, ScheduledMeeting } from "../types";
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

export async function deletePitch(id: string): Promise<void> {
  await api(`/pitches/${id}`, { method: "DELETE" });
}

export async function fetchPitchEvents(pitchId: string): Promise<PitchEvent[]> {
  return api<PitchEvent[]>(`/events/pitch/${pitchId}`);
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
