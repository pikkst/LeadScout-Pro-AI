// AES-256-GCM encryption for settings secrets stored in the database.
// The key is derived from JWT_SECRET so no extra env var is required.
import crypto from "crypto";
import { config } from "../config";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:"; // marks an encrypted value

function getKey(): Buffer {
  // Derive a stable 32-byte key from the app secret.
  return crypto.createHash("sha256").update(String(config.jwtSecret)).digest();
}

export function encryptSecret(plain: string): string {
  if (plain === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored; // legacy/plain value
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}
