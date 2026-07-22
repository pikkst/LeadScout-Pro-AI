import { describe, expect, it } from "vitest";
import { hashApiKey, parseApiKeyScopes } from "./apiKey.service";

describe("API key security helpers", () => {
  it("stores a deterministic SHA-256 digest instead of the raw key", () => {
    const raw = "lsp_test-secret-value";
    const digest = hashApiKey(raw);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain(raw);
    expect(hashApiKey(raw)).toBe(digest);
  });

  it("accepts only supported scopes from persisted JSON", () => {
    expect(parseApiKeyScopes('["read","write","admin",7]')).toEqual(["read", "write"]);
    expect(parseApiKeyScopes("invalid-json")).toEqual([]);
  });
});
