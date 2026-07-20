// Leads & CRM routes: shared team pipeline with assignment, stages, notes,
// follow-up tasks, and scheduled meetings. All routes require authentication.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import type { Lead as PrismaLead } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, forbidden, notFound } from "../utils/httpError";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import {
  serializeLead,
  serializeMeeting,
  stageToDb,
  meetingTypeToDb,
} from "../utils/serializers";
import { logActivity } from "../utils/activity";
import { param } from "../utils/param";
import { normalizeDomain, normalizeEmail } from "../utils/normalize";

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

const leadInclude = {
  assignedAgent: true,
  createdBy: { select: { id: true, name: true } },
  followUpTask: true,
  meetings: { orderBy: { date: "asc" as const } },
};

const STAGE_VALUES = ["Discovered", "Contacted", "Negotiation", "Signed", "Active", "Archived"] as const;

// ---- List / filter leads ----
const listQuerySchema = z.object({
  stage: z.enum(STAGE_VALUES).optional(),
  focus: z.string().optional(),
  mine: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

leadsRouter.get(
  "/",
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { stage, focus, mine, search } = req.query as z.infer<typeof listQuerySchema>;
    const where: Record<string, unknown> = {};
    if (stage) where.stage = stageToDb(stage);
    if (focus) where.focus = focus;
    if (mine) where.assignedAgentId = req.user!.id;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { website: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }
    const leads = await prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: { updatedAt: "desc" },
    });
    res.json(leads.map(serializeLead));
  }),
);

// ---- Create a single lead ----
const createLeadSchema = z.object({
  name: z.string().min(1),
  website: z.string().min(1),
  category: z.string().min(1),
  email: z.string().min(1),
  description: z.string().optional().default(""),
  phone: z.string().optional(),
  sourceUrl: z.string().optional(),
  focus: z.string().optional(),
  isVerified: z.boolean().optional(),
  stage: z.enum(STAGE_VALUES).optional(),
  notes: z.string().optional(),
  estimatedValue: z.number().int().nonnegative().optional(),
  assignedAgentId: z.string().optional().nullable(),
  source: z.string().optional(),
});

leadsRouter.post(
  "/",
  validate({ body: createLeadSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createLeadSchema>;
    const lead = await prisma.lead.upsert({
      where: { website_email: { website: body.website, email: body.email } },
      update: {}, // don't overwrite existing pipeline data on duplicate discovery
      create: {
        name: body.name,
        website: body.website,
        domain: normalizeDomain(body.website),
        category: body.category,
        email: body.email,
        description: body.description ?? "",
        phone: body.phone,
        sourceUrl: body.sourceUrl,
        focus: body.focus,
        isVerified: body.isVerified ?? false,
        stage: stageToDb(body.stage),
        notes: body.notes ?? "",
        estimatedValue: body.estimatedValue ?? 0,
        assignedAgentId: body.assignedAgentId ?? null,
        createdById: req.user!.id,
        source: (body.source as any) ?? "MANUAL",
      },
      include: leadInclude,
    });
    await logActivity({ action: "LEAD_CREATED", detail: lead.name, userId: req.user!.id, leadId: lead.id });
    res.status(201).json(serializeLead(lead));
  }),
);

// ---- Bulk import (used after an AI scouting run) ----
const bulkSchema = z.object({ leads: z.array(createLeadSchema).max(500) });

leadsRouter.post(
  "/bulk",
  validate({ body: bulkSchema }),
  asyncHandler(async (req, res) => {
    const { leads } = req.body as z.infer<typeof bulkSchema>;
    const created: PrismaLead[] = [];
    const skipped: { name: string; website: string; email: string; reason: string }[] = [];

    for (const body of leads) {
      const domain = normalizeDomain(body.website);
      const email = normalizeEmail(body.email);

      // Skip if the same company (domain) or the same email already exists in the
      // shared pipeline — avoids duplicate scouting results across missions.
      const existing = await prisma.lead.findFirst({
        where: { OR: [{ email }, { domain }] },
        select: { name: true, website: true, email: true },
      });
      if (existing) {
        const reason =
          normalizeEmail(existing.email) === email
            ? `email ${email} already in pipeline`
            : `company ${domain} already in pipeline`;
        skipped.push({ name: body.name, website: body.website, email: body.email, reason });
        continue;
      }

      const lead = await prisma.lead.create({
        data: {
          name: body.name,
          website: body.website,
          domain,
          category: body.category,
          email: body.email,
          description: body.description ?? "",
          phone: body.phone,
          sourceUrl: body.sourceUrl,
          focus: body.focus,
          isVerified: body.isVerified ?? false,
          stage: stageToDb(body.stage),
          notes: body.notes ?? "",
          estimatedValue: body.estimatedValue ?? 0,
          assignedAgentId: body.assignedAgentId ?? null,
          createdById: req.user!.id,
          source: (body.source as any) ?? "CSV_IMPORT",
        },
        include: leadInclude,
      });
      created.push(lead);
    }

    await logActivity({
      action: "LEADS_IMPORTED",
      detail: `${created.length} imported, ${skipped.length} skipped (duplicates)`,
      userId: req.user!.id,
    });
    res.status(201).json({
      created: created.map(serializeLead),
      skipped,
      imported: created.length,
      skippedCount: skipped.length,
    });
  }),
);

// ---- Get one lead ----
leadsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: param(req, "id") }, include: leadInclude });
    if (!lead) throw notFound("Lead not found");
    res.json(serializeLead(lead));
  }),
);

// ---- Update a lead (CRM fields) ----
const updateLeadSchema = createLeadSchema.partial().extend({
  lastContactedAt: z.string().datetime().optional().nullable(),
});

leadsRouter.patch(
  "/:id",
  validate({ body: updateLeadSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateLeadSchema>;
    const existing = await prisma.lead.findUnique({ where: { id: param(req, "id") } });
    if (!existing) throw notFound("Lead not found");

    const data: Record<string, unknown> = {};
    for (const key of ["name", "website", "category", "email", "description", "phone", "sourceUrl", "focus", "notes"] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.isVerified !== undefined) data.isVerified = body.isVerified;
    if (body.estimatedValue !== undefined) data.estimatedValue = body.estimatedValue;
    if (body.stage !== undefined) data.stage = stageToDb(body.stage);
    if (body.assignedAgentId !== undefined) data.assignedAgentId = body.assignedAgentId;
    if (body.lastContactedAt !== undefined)
      data.lastContactedAt = body.lastContactedAt ? new Date(body.lastContactedAt) : null;

    const lead = await prisma.lead.update({ where: { id: param(req, "id") }, data, include: leadInclude });
    await logActivity({ action: "LEAD_UPDATED", detail: lead.name, userId: req.user!.id, leadId: lead.id });
    res.json(serializeLead(lead));
  }),
);

// ---- Update stage only (pipeline drag/drop) ----
const stageSchema = z.object({ stage: z.enum(STAGE_VALUES) });

leadsRouter.patch(
  "/:id/stage",
  validate({ body: stageSchema }),
  asyncHandler(async (req, res) => {
    const { stage } = req.body as z.infer<typeof stageSchema>;
    const data: Record<string, unknown> = { stage: stageToDb(stage) };
    if (stage === "Contacted") data.lastContactedAt = new Date();
    const lead = await prisma.lead.update({ where: { id: param(req, "id") }, data, include: leadInclude });
    await logActivity({
      action: "LEAD_STAGE_CHANGED",
      detail: `${lead.name} → ${stage}`,
      userId: req.user!.id,
      leadId: lead.id,
    });
    res.json(serializeLead(lead));
  }),
);

// ---- Assign / reassign ----
const assignSchema = z.object({ assignedAgentId: z.string().nullable() });

leadsRouter.patch(
  "/:id/assign",
  validate({ body: assignSchema }),
  asyncHandler(async (req, res) => {
    const { assignedAgentId } = req.body as z.infer<typeof assignSchema>;
    if (assignedAgentId) {
      const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } });
      if (!agent) throw badRequest("Assigned agent does not exist.");
    }
    const lead = await prisma.lead.update({
      where: { id: param(req, "id") },
      data: { assignedAgentId },
      include: leadInclude,
    });
    await logActivity({ action: "LEAD_ASSIGNED", userId: req.user!.id, leadId: lead.id });
    res.json(serializeLead(lead));
  }),
);

// ---- Delete ----
leadsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.lead.findUnique({ where: { id: param(req, "id") } });
    if (!existing) throw notFound("Lead not found");
    // Only admins/managers or the creator/assignee may delete.
    const role = req.user!.role;
    const canDelete =
      role === "ADMIN" ||
      role === "MANAGER" ||
      existing.createdById === req.user!.id ||
      existing.assignedAgentId === req.user!.id;
    if (!canDelete) throw forbidden("You cannot delete this lead.");
    await prisma.lead.delete({ where: { id: param(req, "id") } });
    await logActivity({ action: "LEAD_DELETED", detail: existing.name, userId: req.user!.id });
    res.json({ ok: true });
  }),
);

// ---- Follow-up task (one per lead) ----
const followUpSchema = z.object({
  taskName: z.string().min(1),
  dueDate: z.string(),
  isCompleted: z.boolean().optional(),
  notes: z.string().optional(),
});

leadsRouter.put(
  "/:id/follow-up",
  validate({ body: followUpSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof followUpSchema>;
    const lead = await prisma.lead.findUnique({ where: { id: param(req, "id") } });
    if (!lead) throw notFound("Lead not found");
    const due = new Date(body.dueDate);
    if (isNaN(due.getTime())) throw badRequest("Invalid dueDate");

    await prisma.followUpTask.upsert({
      where: { leadId: param(req, "id") },
      update: {
        taskName: body.taskName,
        dueDate: due,
        isCompleted: body.isCompleted ?? false,
        notes: body.notes ?? "",
      },
      create: {
        leadId: param(req, "id"),
        taskName: body.taskName,
        dueDate: due,
        isCompleted: body.isCompleted ?? false,
        notes: body.notes ?? "",
      },
    });
    const updated = await prisma.lead.findUnique({ where: { id: param(req, "id") }, include: leadInclude });
    res.json(serializeLead(updated));
  }),
);

leadsRouter.delete(
  "/:id/follow-up",
  asyncHandler(async (req, res) => {
    await prisma.followUpTask.deleteMany({ where: { leadId: param(req, "id") } });
    const updated = await prisma.lead.findUnique({ where: { id: param(req, "id") }, include: leadInclude });
    if (!updated) throw notFound("Lead not found");
    res.json(serializeLead(updated));
  }),
);

// ---- Meetings ----
const meetingSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  time: z.string(),
  duration: z.number().int().positive().optional(),
  type: z.enum(["Call", "Meeting", "Demo", "Follow-up"]).optional(),
  agenda: z.string().optional(),
  link: z.string().optional(),
});

leadsRouter.post(
  "/:id/meetings",
  validate({ body: meetingSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof meetingSchema>;
    const lead = await prisma.lead.findUnique({ where: { id: param(req, "id") } });
    if (!lead) throw notFound("Lead not found");
    const meeting = await prisma.meeting.create({
      data: {
        leadId: param(req, "id"),
        title: body.title,
        date: body.date,
        time: body.time,
        duration: body.duration ?? 30,
        type: meetingTypeToDb(body.type),
        agenda: body.agenda ?? "",
        link: body.link,
      },
    });
    await logActivity({ action: "MEETING_SCHEDULED", detail: body.title, userId: req.user!.id, leadId: lead.id });
    res.status(201).json(serializeMeeting(meeting));
  }),
);

leadsRouter.delete(
  "/:id/meetings/:meetingId",
  asyncHandler(async (req, res) => {
    await prisma.meeting.deleteMany({ where: { id: param(req, "meetingId"), leadId: param(req, "id") } });
    res.json({ ok: true });
  }),
);
