-- API key digests now use a server-keyed HMAC. Existing deterministic SHA-256
-- digests cannot be upgraded without the raw key, so revoke them explicitly.
UPDATE "api_keys"
SET "isRevoked" = true
WHERE "isRevoked" = false;
