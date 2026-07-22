import { prisma } from "../db";
import { notFound } from "../utils/httpError";
import { normalizeDomain, normalizeEmail } from "../utils/normalize";

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

export async function ensureRelationshipGraphForLead(leadId: string) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw notFound("Lead not found");
    const domain = normalizeDomain(lead.domain || lead.website) || null;
    let account = lead.accountId ? await tx.account.findUnique({ where: { id: lead.accountId } }) : null;
    if (!account && domain) account = await tx.account.findUnique({ where: { domain } });
    if (!account) {
      account = await tx.account.create({
        data: {
          name: lead.name,
          domain,
          website: lead.website || null,
          industry: lead.category || null,
          description: lead.description,
          ownerId: lead.assignedAgentId || lead.createdById,
        },
      });
    } else {
      account = await tx.account.update({
        where: { id: account.id },
        data: {
          name: lead.name,
          website: lead.website || account.website,
          industry: lead.category || account.industry,
          description: lead.description || account.description,
          ownerId: lead.assignedAgentId || lead.createdById || account.ownerId,
        },
      });
    }
    if (lead.accountId !== account.id) await tx.lead.update({ where: { id: lead.id }, data: { accountId: account.id } });

    const contact = await tx.contact.upsert({
      where: { legacyLeadId: lead.id },
      update: {
        accountId: account.id,
        fullName: lead.name,
        email: normalizeEmail(lead.email),
        phone: lead.phone,
        ownerId: lead.assignedAgentId || lead.createdById,
      },
      create: {
        accountId: account.id,
        legacyLeadId: lead.id,
        fullName: lead.name,
        email: normalizeEmail(lead.email),
        phone: lead.phone,
        ownerId: lead.assignedAgentId || lead.createdById,
        consentSource: lead.source,
      },
    });

    let opportunity = await tx.opportunity.findFirst({ where: { legacyLeadId: lead.id }, orderBy: { createdAt: "asc" } });
    if (!opportunity) {
      opportunity = await tx.opportunity.create({
        data: {
          accountId: account.id,
          primaryContactId: contact.id,
          legacyLeadId: lead.id,
          ownerId: lead.assignedAgentId || lead.createdById,
          name: `${lead.name} opportunity`,
          stage: lead.stage,
          value: lead.estimatedValue,
          probability: Math.max(0, Math.min(100, lead.aiScore ?? 10)),
        },
      });
    }

    let relationship = await tx.relationship.findFirst({ where: { legacyLeadId: lead.id }, orderBy: { createdAt: "asc" } });
    if (!relationship) {
      relationship = await tx.relationship.create({
        data: {
          accountId: account.id,
          contactId: contact.id,
          opportunityId: opportunity.id,
          legacyLeadId: lead.id,
          ownerId: lead.assignedAgentId || lead.createdById,
          lastInteractionAt: lead.lastContactedAt,
        },
      });
    }
    return { lead, account, contact, opportunity, relationship };
  });
}

function item(input: Omit<UnifiedTimelineItem, "occurredAt"> & { occurredAt: Date }): UnifiedTimelineItem {
  return { ...input, occurredAt: input.occurredAt.toISOString() };
}

export async function getUnifiedTimeline(leadId: string): Promise<UnifiedTimelineItem[]> {
  await ensureRelationshipGraphForLead(leadId);
  const [lead, persisted] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: true,
        pitches: { include: { events: true } },
        meetings: true,
        followUpTask: true,
        documents: true,
      },
    }),
    prisma.timelineEntry.findMany({ where: { legacyLeadId: leadId }, orderBy: { occurredAt: "desc" } }),
  ]);
  if (!lead) throw notFound("Lead not found");
  const items: UnifiedTimelineItem[] = [
    item({ id: `lead:${lead.id}`, type: "STAGE_CHANGE", title: `Relationship created in ${lead.stage}`, body: lead.notes, occurredAt: lead.createdAt, sourceType: "lead", sourceId: lead.id }),
    ...lead.activities.map((activity) => item({ id: `activity:${activity.id}`, type: activity.action, title: activity.action.replace(/_/g, " "), body: activity.detail, occurredAt: activity.createdAt, sourceType: "activity", sourceId: activity.id })),
    ...lead.pitches.map((pitch) => item({ id: `pitch:${pitch.id}`, type: pitch.status === "REPLIED" ? "REPLY" : "EMAIL", title: pitch.subject, body: pitch.textContent, occurredAt: pitch.sentAt || pitch.createdAt, sourceType: "pitch", sourceId: pitch.id, metadata: { status: pitch.status, direction: pitch.inReplyToId ? "INBOUND" : "OUTBOUND" } })),
    ...lead.pitches.flatMap((pitch) => pitch.events.map((event) => item({ id: `pitch-event:${event.id}`, type: event.type, title: `Email ${event.type.toLowerCase()}`, body: pitch.subject, occurredAt: event.createdAt, sourceType: "pitchEvent", sourceId: event.id }))),
    ...lead.meetings.map((meeting) => item({ id: `meeting:${meeting.id}`, type: "MEETING", title: meeting.title, body: meeting.agenda, occurredAt: new Date(`${meeting.date}T${meeting.time}:00`), sourceType: "meeting", sourceId: meeting.id, metadata: { duration: meeting.duration, timezone: meeting.timezone } })),
    ...(lead.followUpTask ? [item({ id: `task:${lead.followUpTask.id}`, type: "TASK", title: lead.followUpTask.taskName, body: lead.followUpTask.notes, occurredAt: lead.followUpTask.dueDate, sourceType: "task", sourceId: lead.followUpTask.id, metadata: { completed: lead.followUpTask.isCompleted } })] : []),
    ...lead.documents.map((document) => item({ id: `document:${document.id}`, type: "DOCUMENT", title: document.title, body: document.type, occurredAt: document.createdAt, sourceType: "document", sourceId: document.id })),
    ...persisted.map((entry) => item({ id: `timeline:${entry.id}`, type: entry.type, title: entry.title, body: entry.body, occurredAt: entry.occurredAt, sourceType: entry.sourceType || "timeline", sourceId: entry.sourceId || entry.id, metadata: entry.metadata })),
  ];
  return items.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export async function listRelationshipRecords(userId: string, role: string, search?: string) {
  const where = {
    ...(role === "AGENT" ? { OR: [{ ownerId: userId }, { legacyLeads: { some: { assignedAgentId: userId } } }] } : {}),
    ...(search ? { AND: [{ OR: [{ name: { contains: search, mode: "insensitive" as const } }, { domain: { contains: search, mode: "insensitive" as const } }, { contacts: { some: { email: { contains: search, mode: "insensitive" as const } } } }] }] } : {}),
  };
  return prisma.account.findMany({
    where,
    include: {
      contacts: { orderBy: { updatedAt: "desc" }, take: 5 },
      opportunities: { where: { status: "OPEN" }, orderBy: { updatedAt: "desc" } },
      relationships: { orderBy: { updatedAt: "desc" }, take: 5 },
      legacyLeads: { select: { id: true, stage: true, assignedAgentId: true }, take: 5 },
      _count: { select: { conversations: true, timelineEntries: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function getRelationshipRecord(leadId: string) {
  const graph = await ensureRelationshipGraphForLead(leadId);
  const [account, timeline] = await Promise.all([
    prisma.account.findUnique({
      where: { id: graph.account.id },
      include: {
        contacts: { orderBy: { updatedAt: "desc" } },
        opportunities: { orderBy: { updatedAt: "desc" } },
        relationships: { include: { owner: { select: { id: true, name: true, email: true } } }, orderBy: { updatedAt: "desc" } },
        conversations: { include: { messages: { orderBy: { occurredAt: "asc" } } }, orderBy: { lastMessageAt: "desc" } },
        legacyLeads: true,
      },
    }),
    getUnifiedTimeline(leadId),
  ]);
  return { ...graph, account, timeline };
}

export async function addRelationshipNote(input: { leadId: string; body: string; actorId: string }) {
  const graph = await ensureRelationshipGraphForLead(input.leadId);
  return prisma.timelineEntry.create({
    data: {
      type: "NOTE",
      title: "Note added",
      body: input.body,
      occurredAt: new Date(),
      accountId: graph.account.id,
      contactId: graph.contact.id,
      opportunityId: graph.opportunity.id,
      relationshipId: graph.relationship.id,
      legacyLeadId: input.leadId,
      actorId: input.actorId,
      sourceType: "note",
    },
  });
}
