// API keys for external integrations (Zapier, Make, etc.)
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { param } from "../utils/param";
import crypto from "crypto";
import { API_KEY_SCOPES, hashApiKey, parseApiKeyScopes } from "../services/apiKey.service";

export const apiKeysRouter = Router();
apiKeysRouter.use(requireAuth);

const apiKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).default(["read"]),
});

// ---- List API keys ----
apiKeysRouter.get("/", asyncHandler(async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  res.json(keys.map((key) => ({ ...key, scopes: parseApiKeyScopes(key.scopes) })));
}));

// ---- Create API key ----
apiKeysRouter.post("/", asyncHandler(async (req, res) => {
  const data = apiKeySchema.parse(req.body);

  const rawKey = `lsp_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 8);

  const key = await prisma.apiKey.create({
    data: {
      name: data.name,
      keyHash: hashApiKey(rawKey),
      keyPrefix,
      userId: req.user!.id,
      scopes: JSON.stringify(data.scopes),
    },
  });

  res.json({
    id: key.id,
    name: key.name,
    key: rawKey,
    keyPrefix: key.keyPrefix,
    scopes: parseApiKeyScopes(key.scopes),
    createdAt: key.createdAt,
  });
}));

// ---- Revoke API key ----
apiKeysRouter.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.apiKey.delete({
    where: { id: param(req, "id"), userId: req.user!.id },
  });
  res.json({ success: true });
}));
