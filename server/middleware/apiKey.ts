import { Request, Response, NextFunction } from "express";
import { verifyApiKey, type ApiKeyScope } from "../services/apiKey.service";
import { asyncHandler } from "../utils/asyncHandler";
import { forbidden, unauthorized } from "../utils/httpError";

declare global {
  namespace Express {
    interface Request {
      apiKey?: { id: string; scopes: ApiKeyScope[] };
    }
  }
}

export const requireApiKey = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.header("authorization");
  const key = req.header("x-api-key") || (authorization?.startsWith("Bearer lsp_") ? authorization.slice(7) : null);
  if (!key) throw unauthorized("API key required");

  const record = await verifyApiKey(key);
  if (!record) {
    throw unauthorized("Invalid API key");
  }

  req.apiKey = { id: record.id, scopes: record.parsedScopes };
  req.user = { id: record.user.id, email: record.user.email, name: record.user.name, role: record.user.role };
  next();
});

export function requireApiKeyScope(scope: ApiKeyScope) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.apiKey) return next(unauthorized("API key required"));
    if (!req.apiKey.scopes.includes(scope)) return next(forbidden(`API key requires the ${scope} scope`));
    next();
  };
}
