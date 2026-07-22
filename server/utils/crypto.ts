// AES-256-GCM encryption for settings secrets stored in the database.
// New values use a dedicated encryption key. v1 values remain readable during migration.
import crypto from "crypto";
import { config } from "../config";

const ALGO = "aes-256-gcm";
const LEGACY_PREFIX = "enc:v1:";
const PREFIX = "enc:v2:";

function getKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  if (plain === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(config.settingsEncryptionKey), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX) && !stored.startsWith(LEGACY_PREFIX)) return stored;
  try {
    const isLegacy = stored.startsWith(LEGACY_PREFIX);
    const prefix = isLegacy ? LEGACY_PREFIX : PREFIX;
    const raw = Buffer.from(stored.slice(prefix.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, getKey(isLegacy ? config.jwtSecret : config.settingsEncryptionKey), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && (value.startsWith(PREFIX) || value.startsWith(LEGACY_PREFIX));
}
