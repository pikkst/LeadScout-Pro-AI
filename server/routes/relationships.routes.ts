import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, AuthUser } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { forbidden, notFound } from "../utils/httpError";
import { normalizeDomain, normalizeEmail } from "../utils/normalize";
import { param } from "../utils/param";
import {
  addRelationshipNote,
  getRelationshipRecord,
  listRelationshipRecords,
  getUnifiedTimeline,
} from "../services/relationship.service";

export const relationshipsRouter = Router();
relationshipsRouter.use(requireAuth);

async function assertLeadAccess(leadId: string, user: AuthUser) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, assignedAgentId: true, createdById: true } });
  if (!lead) throw notFound("Lead not found");
  if (user.role === "AGENT" && lead.assignedAgentId !== user.id && lead.createdById !== user.id) throw forbidden("You cannot access this relationship.");
}

relationshipsRouter.get("/", asyncHandler(async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 200) : undefined;
  res.json(await listRelationshipRecords(req.user!.id, req.user!.role, search));
}));

relationshipsRouter.get("/lead/:leadId", asyncHandler(async (req, res) => {
  const leadId = param(req, "leadId");
  await assertLeadAccess(leadId, req.user!);
  res.json(await getRelationshipRecord(leadId));
}));

relationshipsRouter.get("/lead/:leadId/timeline", asyncHandler(async (req, res) => {
  const leadId = param(req, "leadId");
  await assertLeadAccess(leadId, req.user!);
  res.json(await getUnifiedTimeline(leadId));
}));

relationshipsRouter.post(
  "/lead/:leadId/notes",
  validate({ body: z.object({ body: z.string().trim().min(1).max(10_000) }) }),
  asyncHandler(async (req, res) => {
    const leadId = param(req, "leadId");
    await assertLeadAccess(leadId, req.user!);
    res.status(201).json(await addRelationshipNote({ leadId, body: req.body.body, actorId: req.user!.id }));
  }),
);

const accountSchema = z.object({
  name: z.string().trim().min(1).max(200),
  domain: z.string().trim().max(253).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),
  description: z.string().max(5000).optional().default(""),
});

relationshipsRouter.post("/accounts", validate({ body: accountSchema }), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof accountSchema>;
  const domain = body.domain ? normalizeDomain(body.domain) : body.website ? normalizeDomain(body.website) : null;
  const existing = domain ? await prisma.account.findUnique({ where: { domain } }) : null;
  if (existing) return res.status(200).json(existing);
  const account = await prisma.account.create({ data: { ...body, domain, ownerId: req.user!.id } as any });
  res.status(201).json(account);
}));

const contactSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().trim().max(80).optional().nullable(),
  title: z.string().trim().max(160).optional().nullable(),
  consentStatus: z.enum(["UNKNOWN", "LEGITIMATE_INTEREST", "CONSENTED", "OPTED_OUT"]).default("UNKNOWN"),
  consentSource: z.string().trim().max(500).optional().nullable(),
});

relationshipsRouter.post("/accounts/:accountId/contacts", validate({ body: contactSchema }), asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw notFound("Account not found");
  if (req.user!.role === "AGENT" && account.ownerId && account.ownerId !== req.user!.id) throw forbidden("You cannot change this account.");
  const body = req.body as z.infer<typeof contactSchema>;
  const contact = await prisma.contact.create({ data: { ...body, email: normalizeEmail(body.email), accountId, ownerId: req.user!.id } as any });
  res.status(201).json(contact);
}));

const opportunitySchema = z.object({
  name: z.string().trim().min(1).max(200),
  stage: z.string().trim().min(1).max(80).default("DISCOVERY"),
  status: z.enum(["OPEN", "WON", "LOST"]).default("OPEN"),
  value: z.number().int().min(0).max(2_000_000_000).default(0),
  currency: z.string().trim().length(3).default("EUR"),
  probability: z.number().int().min(0).max(100).default(10),
  primaryContactId: z.string().optional().nullable(),
  expectedCloseAt: z.string().datetime().optional().nullable(),
});

relationshipsRouter.post("/accounts/:accountId/opportunities", validate({ body: opportunitySchema }), asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw notFound("Account not found");
  if (req.user!.role === "AGENT" && account.ownerId && account.ownerId !== req.user!.id) throw forbidden("You cannot change this account.");
  const body = req.body as z.infer<typeof opportunitySchema>;
  if (body.primaryContactId) {
    const contact = await prisma.contact.findFirst({ where: { id: body.primaryContactId, accountId } });
    if (!contact) throw notFound("Contact not found for this account");
  }
  const opportunity = await prisma.opportunity.create({
    data: { ...body, accountId, ownerId: req.user!.id, currency: body.currency.toUpperCase(), expectedCloseAt: body.expectedCloseAt ? new Date(body.expectedCloseAt) : null } as any,
  });
  await prisma.timelineEntry.create({ data: { type: "OPPORTUNITY", title: `Opportunity created: ${opportunity.name}`, body: `${opportunity.currency} ${opportunity.value}`, occurredAt: new Date(), accountId, opportunityId: opportunity.id, actorId: req.user!.id, sourceType: "opportunity", sourceId: opportunity.id, dedupeKey: `opportunity:create:${opportunity.id}` } });
  res.status(201).json(opportunity);
}));

relationshipsRouter.patch("/opportunities/:id", validate({ body: opportunitySchema.partial() }), asyncHandler(async (req, res) => {
  const id = param(req, "id");
  const existing = await prisma.opportunity.findUnique({ where: { id }, include: { account: true } });
  if (!existing) throw notFound("Opportunity not found");
  if (req.user!.role === "AGENT" && existing.ownerId !== req.user!.id && existing.account.ownerId !== req.user!.id) throw forbidden("You cannot change this opportunity.");
  const body = req.body as z.infer<typeof opportunitySchema>;
  const updated = await prisma.opportunity.update({ where: { id }, data: { ...body, currency: body.currency?.toUpperCase(), expectedCloseAt: body.expectedCloseAt ? new Date(body.expectedCloseAt) : body.expectedCloseAt === null ? null : undefined } as any });
  res.json(updated);
}));

relationshipsRouter.delete("/opportunities/:id", asyncHandler(async (req, res) => {
  const id = param(req, "id");
  const existing = await prisma.opportunity.findUnique({ where: { id }, include: { account: true } });
  if (!existing) throw notFound("Opportunity not found");
  if (req.user!.role === "AGENT" && existing.ownerId !== req.user!.id && existing.account.ownerId !== req.user!.id) throw forbidden("You cannot change this opportunity.");
  await prisma.opportunity.delete({ where: { id } });
  res.json({ success: true });
}));

relationshipsRouter.patch("/accounts/:id", validate({ body: accountSchema.partial() }), asyncHandler(async (req, res) => {
  const id = param(req, "id");
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) throw notFound("Account not found");
  if (req.user!.role === "AGENT" && existing.ownerId && existing.ownerId !== req.user!.id) throw forbidden("You cannot change this account.");
  const body = req.body as z.infer<typeof accountSchema>;
  const domain = body.domain ? normalizeDomain(body.domain) : body.website ? normalizeDomain(body.website) : existing.domain;
  const updated = await prisma.account.update({
    where: { id },
    data: { ...body, domain, ownerId: req.user!.id } as any,
  });
  res.json(updated);
}));

relationshipsRouter.patch("/contacts/:id", validate({ body: contactSchema.partial() }), asyncHandler(async (req, res) => {
  const id = param(req, "id");
  const existing = await prisma.contact.findUnique({ where: { id }, include: { account: true } });
  if (!existing) throw notFound("Contact not found");
  if (req.user!.role === "AGENT" && existing.account.ownerId && existing.account.ownerId !== req.user!.id) throw forbidden("You cannot change this contact.");
  const body = req.body as z.infer<typeof contactSchema>;
  const updated = await prisma.contact.update({
    where: { id },
    data: { ...body, email: normalizeEmail(body.email) } as any,
  });
  res.json(updated);
}));

relationshipsRouter.delete("/contacts/:id", asyncHandler(async (req, res) => {
  const id = param(req, "id");
  const existing = await prisma.contact.findUnique({ where: { id }, include: { account: true } });
  if (!existing) throw notFound("Contact not found");
  if (req.user!.role === "AGENT" && existing.account.ownerId && existing.account.ownerId !== req.user!.id) throw forbidden("You cannot change this contact.");
  await prisma.contact.delete({ where: { id } });
  res.json({ success: true });
}));

const relationshipSchema = z.object({
  type: z.enum(["PROSPECT", "CUSTOMER", "PARTNER", "RECRUITING", "CHANNEL", "OTHER"]).default("PROSPECT"),
  status: z.enum(["ACTIVE", "PAUSED", "CLOSED"]).default("ACTIVE"),
  strength: z.number().int().min(0).max(100).default(0),
  nextActionAt: z.string().datetime().optional().nullable(),
});

relationshipsRouter.post("/accounts/:accountId/relationships", validate({ body: relationshipSchema }), asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw notFound("Account not found");
  if (req.user!.role === "AGENT" && account.ownerId && account.ownerId !== req.user!.id) throw forbidden("You cannot change this account.");
  const body = req.body as z.infer<typeof relationshipSchema>;
  const relationship = await prisma.relationship.create({
    data: { ...body, accountId, ownerId: req.user!.id, nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null } as any,
  });
  res.status(201).json(relationship);
}));

relationshipsRouter.patch("/:id", validate({ body: relationshipSchema.partial() }), asyncHandler(async (req, res) => {
  const id = param(req, "id");
  const existing = await prisma.relationship.findUnique({ where: { id }, include: { account: true } });
  if (!existing) throw notFound("Relationship not found");
  if (req.user!.role === "AGENT" && existing.ownerId !== req.user!.id && existing.account.ownerId !== req.user!.id) throw forbidden("You cannot change this relationship.");
  const body = req.body as z.infer<typeof relationshipSchema>;
  const updated = await prisma.relationship.update({
    where: { id },
    data: { ...body, nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : body.nextActionAt === null ? null : undefined } as any,
  });
  res.json(updated);
}));
