import crypto from "crypto";
import { prisma } from "../db";
import { config } from "../config";

export const API_KEY_SCOPES = ["read", "write"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function hashApiKey(rawKey: string): string {
  return crypto
    .createHmac("sha256", config.settingsEncryptionKey)
    .update("leadscout-api-key\0", "utf8")
    .update(rawKey, "utf8")
    .digest("hex");
}

export function parseApiKeyScopes(value: string): ApiKeyScope[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((scope): scope is ApiKeyScope => API_KEY_SCOPES.includes(scope));
  } catch {
    return [];
  }
}

export async function verifyApiKey(rawKey: string) {
  const record = await prisma.apiKey.findFirst({
    where: { keyHash: hashApiKey(rawKey), isRevoked: false },
    include: { user: true },
  });
  if (!record || !record.user.isActive) return null;
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return { ...record, parsedScopes: parseApiKeyScopes(record.scopes) };
}
