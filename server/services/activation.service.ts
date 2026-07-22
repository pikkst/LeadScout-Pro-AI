import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { AuthUser } from "../middleware/auth";
import { addDays } from "./calendar.service";
import { getCompanyProfile, getEmailSettings, getInternalSetting, setInternalSetting } from "./settings.service";
import { getDeliverabilityStatus } from "./compliance.service";

export const ONBOARDING_TEMPLATES = [
  { id: "founder-sales", name: "Founder Sales", description: "High-context founder outreach to early customers and design partners.", focus: "enterprise_saas", sequenceName: "Founder follow-up", taskName: "Personal founder follow-up" },
  { id: "agency", name: "Agency Growth", description: "Win service retainers with proof-led audits and a low-friction discovery call.", focus: "other", sequenceName: "Agency prospect follow-up", taskName: "Review prospect website and send audit" },
  { id: "partnerships", name: "Strategic Partnerships", description: "Develop channel, technology, and distribution relationships.", focus: "voip_carriers", sequenceName: "Partnership follow-up", taskName: "Prepare mutual-value partnership brief" },
  { id: "recruiting", name: "Recruiting", description: "Reach hiring teams and qualified candidates with role-specific context.", focus: "other", sequenceName: "Recruiting follow-up", taskName: "Review role and candidate fit" },
  { id: "channel-sales", name: "Channel Sales", description: "Recruit and activate resellers, affiliates, and implementation partners.", focus: "enterprise_saas", sequenceName: "Channel partner follow-up", taskName: "Prepare partner economics" },
] as const;

export async function recordActivationEvent(input: {
  type: string;
  userId?: string;
  leadId?: string;
  pitchId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.activationEvent.create({
    data: { ...input, metadata: input.metadata as Prisma.InputJsonValue | undefined },
  });
}

export async function applyOnboardingTemplate(templateId: string, userId: string) {
  const template = ONBOARDING_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error("Unknown onboarding template");

  const existingSequence = await prisma.followUpSequence.findFirst({ where: { name: template.sequenceName } });
  const existingPitchTemplate = await prisma.pitchTemplate.findFirst({ where: { name: `${template.name} introduction` } });
  await prisma.$transaction(async (tx) => {
    if (!existingPitchTemplate) {
      await tx.pitchTemplate.create({
        data: {
          name: `${template.name} introduction`,
          focus: template.focus,
          subject: `A relevant idea for {{company}}`,
          htmlContent: "<p>Hi,</p><p>I noticed a specific opportunity where our teams may be able to create measurable value together.</p><p>Would a short conversation be useful?</p>",
          textContent: "Hi,\n\nI noticed a specific opportunity where our teams may be able to create measurable value together.\n\nWould a short conversation be useful?",
          createdById: userId,
        },
      });
    }
    if (!existingSequence) {
      await tx.followUpSequence.create({
        data: {
          name: template.sequenceName,
          description: template.description,
          triggerStage: "CONTACTED",
          isActive: true,
          steps: {
            create: [
              { order: 0, delayDays: 2, actionType: "TASK", taskName: template.taskName },
              { order: 1, delayDays: 3, actionType: "EMAIL", subject: "Following up on a relevant idea", body: "I wanted to follow up with one concise reason this may be worth exploring. If the timing is not right, I am happy to close the loop." },
            ],
          },
        },
      });
    }
  });
  await setInternalSetting("ONBOARDING_TEMPLATE", template.id, userId);
  await recordActivationEvent({ type: "ONBOARDING_TEMPLATE_APPLIED", userId, metadata: { templateId } });
  return template;
}

export async function getActivationState(user: AuthUser) {
  const [profile, email, templateId, dismissed, availabilityCount, leadCount, pitchCount, sentCount, bookingCount] = await Promise.all([
    getCompanyProfile(),
    getEmailSettings(),
    getInternalSetting("ONBOARDING_TEMPLATE"),
    getInternalSetting(`SETUP_WIZARD_DISMISSED:${user.id}`),
    prisma.availabilityRule.count({ where: { agentId: user.id, isActive: true } }),
    prisma.lead.count({ where: user.role === "AGENT" ? { OR: [{ createdById: user.id }, { assignedAgentId: user.id }] } : {} }),
    prisma.pitch.count({ where: user.role === "AGENT" ? { createdById: user.id } : {} }),
    prisma.pitch.count({ where: { ...(user.role === "AGENT" ? { createdById: user.id } : {}), sentAt: { not: null } } }),
    prisma.meeting.count({ where: user.role === "AGENT" ? { agentId: user.id } : {} }),
  ]);
  const verifiedAt = await getInternalSetting("EMAIL_VERIFIED_AT");
  const profileComplete = Boolean(profile.name && profile.name !== "Your Company" && profile.website && profile.offerings && profile.valueProp);
  const steps = [
    { id: "template", label: "Choose a sales playbook", complete: Boolean(templateId), action: "template" },
    { id: "company", label: "Complete your company profile", complete: profileComplete, action: "settings" },
    { id: "sender", label: "Configure and verify your sender", complete: email.configured && Boolean(verifiedAt), action: "settings" },
    { id: "availability", label: "Publish bookable availability", complete: availabilityCount > 0, action: "calendar" },
    { id: "target", label: "Add or scout your first target", complete: leadCount > 0, action: "scout" },
    { id: "pitch", label: "Create your first quality pitch", complete: pitchCount > 0, action: "outreach" },
    { id: "send", label: "Send your first compliant outreach", complete: sentCount > 0, action: "outreach" },
    { id: "booking", label: "Receive your first booking", complete: bookingCount > 0, action: "calendar" },
  ];
  return {
    templateId: templateId || null,
    dismissed: dismissed === "true",
    complete: steps.slice(0, 7).every((step) => step.complete),
    progress: Math.round((steps.filter((step) => step.complete).length / steps.length) * 100),
    steps,
  };
}

export async function setWizardDismissed(userId: string, dismissed: boolean) {
  await setInternalSetting(`SETUP_WIZARD_DISMISSED:${userId}`, String(dismissed), userId);
}

export async function getCommandCenter(user: AuthUser) {
  const today = new Date().toISOString().slice(0, 10);
  const inSevenDays = addDays(today, 7);
  const overdueBefore = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const pitchScope = user.role === "AGENT" ? { createdById: user.id } : {};
  const leadScope = user.role === "AGENT" ? { OR: [{ createdById: user.id }, { assignedAgentId: user.id }] } : {};
  const [overdueReplies, approvals, meetings, failedSends, highValueLeads, funnelRows, deliverability] = await Promise.all([
    prisma.lead.findMany({
      where: { ...leadScope, stage: "CONTACTED", lastContactedAt: { lt: overdueBefore }, pitches: { none: { status: "REPLIED" } } },
      orderBy: { estimatedValue: "desc" }, take: 10,
      select: { id: true, name: true, email: true, estimatedValue: true, lastContactedAt: true },
    }),
    prisma.pitch.findMany({ where: { ...pitchScope, status: "DRAFT" }, orderBy: { createdAt: "asc" }, take: 10, select: { id: true, leadId: true, leadName: true, subject: true, createdAt: true } }),
    prisma.meeting.findMany({ where: { ...(user.role === "AGENT" ? { agentId: user.id } : {}), date: { gte: today, lte: inSevenDays } }, orderBy: [{ date: "asc" }, { time: "asc" }], take: 10, include: { lead: { select: { name: true } } } }),
    prisma.pitch.findMany({ where: { ...pitchScope, status: "FAILED" }, orderBy: { updatedAt: "desc" }, take: 10, select: { id: true, leadId: true, leadName: true, subject: true, updatedAt: true } }),
    prisma.lead.findMany({ where: { ...leadScope, stage: { notIn: ["ACTIVE", "ARCHIVED"] } }, orderBy: [{ estimatedValue: "desc" }, { aiScore: "desc" }], take: 5, select: { id: true, name: true, stage: true, estimatedValue: true, aiScore: true } }),
    prisma.activationEvent.groupBy({ by: ["type"], _count: { _all: true } }),
    getDeliverabilityStatus(),
  ]);

  const actions = [
    ...failedSends.map((item) => ({ id: `failed:${item.id}`, priority: "urgent", type: "failed-send", title: `Repair failed send to ${item.leadName}`, detail: item.subject, target: "outreach", entityId: item.id })),
    ...overdueReplies.map((item) => ({ id: `overdue:${item.id}`, priority: "high", type: "overdue-reply", title: `Follow up with ${item.name}`, detail: `No reply since ${item.lastContactedAt?.toISOString().slice(0, 10) ?? "last contact"}`, target: "crm", entityId: item.id })),
    ...approvals.map((item) => ({ id: `approval:${item.id}`, priority: "normal", type: "approval", title: `Review draft for ${item.leadName}`, detail: item.subject, target: "outreach", entityId: item.id })),
    ...meetings.slice(0, 3).map((item) => ({ id: `meeting:${item.id}`, priority: "normal", type: "meeting", title: `${item.title} with ${item.lead.name}`, detail: `${item.date} at ${item.time}`, target: "calendar", entityId: item.id })),
  ].slice(0, 20);

  return {
    generatedAt: new Date().toISOString(),
    counts: { overdueReplies: overdueReplies.length, approvals: approvals.length, meetings: meetings.length, failedSends: failedSends.length },
    actions,
    highValueLeads,
    deliverability,
    funnel: Object.fromEntries(funnelRows.map((row) => [row.type, row._count._all])),
  };
}
