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

function decryptPayload(stored: string, prefix: string, secret: string): string {
  const raw = Buffer.from(stored.slice(prefix.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export interface DecryptedSecret {
  value: string;
  needsRotation: boolean;
  decrypted: boolean;
}

export function decryptSecretWithKeyring(
  stored: string,
  currentKey = config.settingsEncryptionKey,
  previousKeys = config.settingsEncryptionPreviousKeys,
): DecryptedSecret {
  if (!stored) return { value: "", needsRotation: false, decrypted: true };
  if (!stored.startsWith(PREFIX) && !stored.startsWith(LEGACY_PREFIX)) {
    return { value: stored, needsRotation: false, decrypted: false };
  }
  if (stored.startsWith(LEGACY_PREFIX)) {
    try {
      return { value: decryptPayload(stored, LEGACY_PREFIX, config.jwtSecret), needsRotation: true, decrypted: true };
    } catch {
      return { value: "", needsRotation: false, decrypted: false };
    }
  }

  const keys = [currentKey, ...previousKeys.filter((key) => key !== currentKey)];
  for (let index = 0; index < keys.length; index += 1) {
    try {
      return { value: decryptPayload(stored, PREFIX, keys[index]), needsRotation: index > 0, decrypted: true };
    } catch {
      // Authentication failure is expected while trying older rotation keys.
    }
  }
  return { value: "", needsRotation: false, decrypted: false };
}

export function decryptSecret(stored: string): string {
  return decryptSecretWithKeyring(stored).value;
}

export function encryptSecretWithKey(plain: string, secret: string): string {
  if (plain === "") return "";
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, getKey(secret), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
  } catch {
    return "";
  }
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && (value.startsWith(PREFIX) || value.startsWith(LEGACY_PREFIX));
}
