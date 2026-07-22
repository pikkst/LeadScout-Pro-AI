// Document generation routes
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { param } from "../utils/param";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);
const canManageTemplates = requireRole("ADMIN", "MANAGER");

const templateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["PROPOSAL", "CONTRACT", "NDA", "QUOTE", "INVOICE", "CUSTOM"]),
  content: z.string(),
  variables: z.string().default("[]"),
  isDefault: z.boolean().default(false),
});

const generateSchema = z.object({
  templateId: z.string(),
  leadId: z.string().optional(),
  title: z.string().min(1),
  variables: z.record(z.string()).default({}),
});

// ---- List templates ----
documentsRouter.get("/templates", asyncHandler(async (_req, res) => {
  const templates = await prisma.documentTemplate.findMany({
    orderBy: { type: "asc" },
  });
  res.json(templates);
}));

// ---- Create template ----
documentsRouter.post("/templates", canManageTemplates, asyncHandler(async (req, res) => {
  const data = templateSchema.parse(req.body);
  const template = await prisma.documentTemplate.create({ data: data as any });
  res.json(template);
}));

// ---- Update template ----
documentsRouter.put("/templates/:id", canManageTemplates, asyncHandler(async (req, res) => {
  const data = templateSchema.parse(req.body);
  const template = await prisma.documentTemplate.update({
    where: { id: param(req, "id") },
    data,
  });
  res.json(template);
}));

// ---- Delete template ----
documentsRouter.delete("/templates/:id", canManageTemplates, asyncHandler(async (req, res) => {
  await prisma.documentTemplate.delete({ where: { id: param(req, "id") } });
  res.json({ success: true });
}));

// ---- Generate document from template ----
documentsRouter.post("/generate", asyncHandler(async (req, res) => {
  const data = generateSchema.parse(req.body);

  const template = await prisma.documentTemplate.findUnique({
    where: { id: data.templateId },
  });
  if (!template) throw notFound("Template not found");

  let content = template.content;
  const variables = data.variables;

  // Replace variables in template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, String(value));
  });

  // Auto-fill common variables if leadId provided
  if (data.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      include: { assignedAgent: { select: { name: true } } },
    });

    if (lead) {
      const autoVars: Record<string, string> = {
        lead_name: lead.name,
        lead_email: lead.email || '',
        lead_website: lead.website || '',
        lead_phone: lead.phone || '',
        lead_description: lead.description || '',
        agent_name: lead.assignedAgent?.name || '',
        company_name: 'Unitel Global',
        date: new Date().toLocaleDateString('en-US'),
      };

      Object.entries(autoVars).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, String(value));
      });
    }
  }

  const doc = await prisma.generatedDocument.create({
    data: {
      title: data.title,
      type: template.type,
      content,
      leadId: data.leadId || null,
      createdById: req.user!.id,
    },
    include: {
      lead: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });

  res.json(doc);
}));

// ---- Generate PDF from document ----
documentsRouter.post("/:id/pdf", asyncHandler(async (req, res) => {
  const doc = await prisma.generatedDocument.findUnique({
    where: { id: param(req, "id") },
  });
  if (!doc) throw notFound("Document not found");

  // In production, use puppeteer or pdfkit to generate actual PDF
  // For now, return HTML content that can be printed to PDF
  res.json({
    html: doc.content,
    title: doc.title,
    message: "Use browser print (Ctrl+P) to save as PDF",
  });
}));

// ---- List generated documents ----
documentsRouter.get("/", asyncHandler(async (req, res) => {
  const { leadId, type } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (leadId) where.leadId = leadId;
  if (type) where.type = type;

  const documents = await prisma.generatedDocument.findMany({
    where,
    include: {
      lead: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(documents);
}));

// ---- Get default templates ----
documentsRouter.get("/templates/defaults", asyncHandler(async (_req, res) => {
  const defaults = [
    {
      name: "Standard Proposal",
      type: "PROPOSAL",
      content: `<!DOCTYPE html>
<html>
<head><title>Business Proposal</title></head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif;">
    <h1>Business Proposal</h1>
    <p>Dear {{lead_name}},</p>
    <p>Thank you for your interest in our services. We are pleased to present this proposal for {{company_name}}.</p>
    <h2>Services Overview</h2>
    <p>We offer comprehensive solutions tailored to your needs...</p>
    <h2>Pricing</h2>
    <p>Our competitive pricing structure is outlined below...</p>
    <h2>Next Steps</h2>
    <p>We look forward to discussing this proposal further...</p>
    <p>Best regards,<br>{{agent_name}}<br>Unitel Global<br>Date: {{date}}</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(["lead_name", "company_name", "agent_name", "date"]),
    },
    {
      name: "Service Agreement",
      type: "CONTRACT",
      content: `<!DOCTYPE html>
<html>
<head><title>Service Agreement</title></head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif;">
    <h1>Service Agreement</h1>
    <p>This Service Agreement ("Agreement") is entered into by and between:</p>
    <p><strong>Provider:</strong> Unitel Global</p>
    <p><strong>Client:</strong> {{lead_name}}</p>
    <h2>1. Services</h2>
    <p>The Provider agrees to provide the services described in Exhibit A...</p>
    <h2>2. Term</h2>
    <p>This Agreement shall commence on {{date}} and continue for a period of 12 months...</p>
    <h2>3. Compensation</h2>
    <p>In consideration for the services, the Client agrees to pay...</p>
    <p>Signed: ____________________<br>Date: {{date}}</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(["lead_name", "company_name", "agent_name", "date"]),
    },
    {
      name: "NDA Template",
      type: "NDA",
      content: `<!DOCTYPE html>
<html>
<head><title>Non-Disclosure Agreement</title></head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif;">
    <h1>Non-Disclosure Agreement</h1>
    <p>This Non-Disclosure Agreement is entered into by {{lead_name}} and Unitel Global...</p>
    <h2>1. Confidential Information</h2>
    <p>For purposes of this Agreement, "Confidential Information" shall include...</p>
    <h2>2. Obligations</h2>
    <p>The receiving party agrees to...</p>
    <p>Date: {{date}}</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(["lead_name", "company_name", "agent_name", "date"]),
    },
  ];

  res.json(defaults);
}));
