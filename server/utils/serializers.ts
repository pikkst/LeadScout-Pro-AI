// Maps Prisma records to the shapes the frontend expects (types.ts),
// and maps frontend enum-like strings to Prisma enums.
import type { LeadStage, MeetingType, PitchStatus } from "@prisma/client";

const STAGE_TO_DB: Record<string, string> = {
  Discovered: "DISCOVERED",
  Contacted: "CONTACTED",
  Negotiation: "NEGOTIATION",
  Signed: "SIGNED",
  Active: "ACTIVE",
  Archived: "ARCHIVED",
};
const STAGE_FROM_DB: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_TO_DB).map(([k, v]) => [v, k]),
);

const MEETING_TYPE_TO_DB: Record<string, string> = {
  Call: "CALL",
  Meeting: "MEETING",
  Demo: "DEMO",
  "Follow-up": "FOLLOW_UP",
};
const MEETING_TYPE_FROM_DB: Record<string, string> = Object.fromEntries(
  Object.entries(MEETING_TYPE_TO_DB).map(([k, v]) => [v, k]),
);

const PITCH_STATUS_TO_DB: Record<string, string> = {
  Draft: "DRAFT",
  Sent: "SENT",
  Delivered: "DELIVERED",
  Replied: "REPLIED",
  Failed: "FAILED",
};
const PITCH_STATUS_FROM_DB: Record<string, string> = Object.fromEntries(
  Object.entries(PITCH_STATUS_TO_DB).map(([k, v]) => [v, k]),
);

export const stageToDb = (s?: string): LeadStage =>
  (s ? STAGE_TO_DB[s] ?? "DISCOVERED" : "DISCOVERED") as LeadStage;
export const stageFromDb = (s: string) => STAGE_FROM_DB[s] ?? "Discovered";
export const meetingTypeToDb = (s?: string): MeetingType =>
  (s ? MEETING_TYPE_TO_DB[s] ?? "CALL" : "CALL") as MeetingType;
export const meetingTypeFromDb = (s: string) => MEETING_TYPE_FROM_DB[s] ?? "Call";
export const pitchStatusToDb = (s?: string): PitchStatus =>
  (s ? PITCH_STATUS_TO_DB[s] ?? "DRAFT" : "DRAFT") as PitchStatus;
export const pitchStatusFromDb = (s: string) => PITCH_STATUS_FROM_DB[s] ?? "Draft";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function serializeLead(lead: any) {
  return {
    id: lead.id,
    name: lead.name,
    website: lead.website,
    category: lead.category,
    email: lead.email,
    description: lead.description ?? "",
    phone: lead.phone ?? undefined,
    sourceUrl: lead.sourceUrl ?? undefined,
    focus: lead.focus ?? undefined,
    isVerified: lead.isVerified,
    stage: stageFromDb(lead.stage),
    notes: lead.notes ?? "",
    estimatedValue: lead.estimatedValue ?? 0,
    assignedAgent: lead.assignedAgent?.name ?? undefined,
    assignedAgentId: lead.assignedAgentId ?? undefined,
    createdAt: lead.createdAt?.toISOString?.() ?? lead.createdAt,
    lastContactedAt: lead.lastContactedAt?.toISOString?.() ?? lead.lastContactedAt ?? undefined,
    followUpTask: lead.followUpTask
      ? {
          id: lead.followUpTask.id,
          taskName: lead.followUpTask.taskName,
          dueDate: lead.followUpTask.dueDate?.toISOString?.() ?? lead.followUpTask.dueDate,
          isCompleted: lead.followUpTask.isCompleted,
          notes: lead.followUpTask.notes ?? "",
        }
      : undefined,
    scheduledMeetings: Array.isArray(lead.meetings)
      ? lead.meetings.map(serializeMeeting)
      : undefined,
  };
}

export function serializeMeeting(m: any) {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    time: m.time,
    duration: m.duration,
    type: meetingTypeFromDb(m.type),
    agenda: m.agenda ?? undefined,
    link: m.link ?? undefined,
  };
}

export function serializePitch(p: any) {
  return {
    id: p.id,
    leadId: p.leadId,
    leadName: p.leadName,
    leadEmail: p.leadEmail,
    subject: p.subject,
    htmlContent: p.htmlContent,
    textContent: p.textContent,
    language: p.language,
    status: pitchStatusFromDb(p.status),
    sentAt: p.sentAt?.toISOString?.() ?? p.sentAt ?? undefined,
    opened: p.opened,
  };
}

export function serializeUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
  };
}
