import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireApiKey, requireApiKeyScope } from "../middleware/apiKey";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { normalizeDomain, normalizeEmail } from "../utils/normalize";
import { recordActivationEvent } from "../services/activation.service";

export const integrationsRouter = Router();
integrationsRouter.use(requireApiKey);

const integrationLeadSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().min(1).max(500),
  email: z.string().email(),
  category: z.string().min(1).max(120),
  description: z.string().max(5000).optional().default(""),
  phone: z.string().max(80).optional(),
  focus: z.string().max(120).optional(),
});

integrationsRouter.get("/leads", requireApiKeyScope("read"), asyncHandler(async (_req, res) => {
  const leads = await prisma.lead.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
  res.json(leads);
}));

integrationsRouter.post(
  "/leads",
  requireApiKeyScope("write"),
  validate({ body: integrationLeadSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof integrationLeadSchema>;
    const email = normalizeEmail(body.email);
    const domain = normalizeDomain(body.website);
    const existing = await prisma.lead.findFirst({ where: { OR: [{ email }, { domain }] } });
    if (existing) return res.status(200).json(existing);
    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        website: body.website,
        category: body.category,
        description: body.description,
        phone: body.phone,
        focus: body.focus,
        email,
        domain,
        source: "MANUAL",
        createdBy: { connect: { id: req.user!.id } },
      },
    });
    await recordActivationEvent({ type: "TARGET_CREATED", userId: req.user!.id, leadId: lead.id, metadata: { source: "INTEGRATION" } });
    res.status(201).json(lead);
  }),
);
