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

export async function importLeads(
  leads: Array<Partial<CompanyLead> & { focus?: string }>,
): Promise<CompanyLead[]> {
  return api<CompanyLead[]>("/leads/bulk", { method: "POST", body: JSON.stringify({ leads }) });
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
): Promise<OutreachPitch> {
  return api<OutreachPitch>("/pitches/generate", {
    method: "POST",
    body: JSON.stringify({ leadId, focus, preferredLanguage }),
  });
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
