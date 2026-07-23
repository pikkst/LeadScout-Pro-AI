// Marketplaces routes: CRUD for playbook packs.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";
import { listPacks, getPack, createPack as serviceCreate, updatePack as serviceUpdate, addPackItem as serviceAddItem, removePackItem as serviceRemoveItem, deletePack as serviceDelete, applyPackToWorkspace } from "../services/playbookMarketplace.service";

export const marketplaceRouter = Router();
marketplaceRouter.use(requireAuth);

const canWrite = requireRole("ADMIN", "MANAGER");

const packSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  visibility: z.enum(["PRIVATE", "CURATED"]).default("PRIVATE"),
  vertical: z.string().optional(),
  playbookIds: z.array(z.string()).optional(),
});

type PackInput = z.infer<typeof packSchema>;

const packUpdateSchema = packSchema.partial();
type PackUpdateInput = z.infer<typeof packUpdateSchema>;

marketplaceRouter.get("/packs", asyncHandler(async (req, res) => {
  const visibility = typeof req.query.visibility === "string" ? req.query.visibility : undefined;
  const vertical = typeof req.query.vertical === "string" ? req.query.vertical : undefined;

  const packs = await listPacks({ visibility, vertical });
  res.json(packs);
}));

marketplaceRouter.post("/packs", canWrite, validate({ body: packSchema }), asyncHandler(async (req, res) => {
  const body = req.body as PackInput;
  const pack = await serviceCreate(body as Parameters<typeof serviceCreate>[0], req.user!.id);
  res.status(201).json(pack);
}));

marketplaceRouter.get("/packs/:slug", asyncHandler(async (req, res) => {
  const pack = await getPack(param(req, "slug"));
  res.json(pack);
}));

marketplaceRouter.patch("/packs/:slug", canWrite, validate({ body: packUpdateSchema }), asyncHandler(async (req, res) => {
  const body = req.body as PackUpdateInput;
  const pack = await serviceUpdate(param(req, "slug"), body);
  res.json(pack);
}));

marketplaceRouter.post("/packs/:slug/items", canWrite, validate({ body: z.object({ playbookId: z.string(), sortOrder: z.number().int().optional() }) }), asyncHandler(async (req, res) => {
  const item = await serviceAddItem(param(req, "slug"), (req.body as { playbookId: string }).playbookId, (req.body as { sortOrder?: number }).sortOrder);
  res.status(201).json(item);
}));

marketplaceRouter.delete("/packs/:slug/items/:playbookId", canWrite, asyncHandler(async (req, res) => {
  await serviceRemoveItem(param(req, "slug"), param(req, "playbookId"));
  res.json({ ok: true });
}));

marketplaceRouter.delete("/packs/:slug", canWrite, asyncHandler(async (req, res) => {
  await serviceDelete(param(req, "slug"));
  res.json({ ok: true });
}));

marketplaceRouter.post("/packs/:slug/apply", canWrite, validate({ body: z.object({ playbookIds: z.array(z.string()).optional() }) }), asyncHandler(async (req, res) => {
  const result = await applyPackToWorkspace(param(req, "slug"), (req.body as { playbookIds?: string[] }).playbookIds);
  res.json(result);
}));
