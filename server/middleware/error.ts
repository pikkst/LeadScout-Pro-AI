// Global error handler + 404 handler. Produces consistent JSON error responses.
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/httpError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" });
}

// Derive a safe, user-facing message from an unexpected error. We intentionally
// surface the original message (it usually carries the real cause, e.g. a Gemini
// API error) but strip anything that looks like a secret/key.
function safeMessage(err: unknown): string {
  if (process.env.NODE_ENV === "production") return "Internal server error";
  const raw = (err as { message?: string })?.message || "Internal server error";
  return raw
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "***REDACTED***")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "***REDACTED***")
    .replace(/password["']?\s*[:=]\s*["']?[^"'\s]+/gi, 'password=***REDACTED***');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const ts = new Date().toISOString();
  const path = `${req.method} ${req.originalUrl || req.path}`;

  if (err instanceof HttpError) {
    console.error(`[error] ${ts} ${path} -> ${err.status} ${err.code}: ${err.message}`);
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma unique-constraint and known errors surface as 409/400 where useful.
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === "P2002") {
    console.error(`[error] ${ts} ${path} -> 409 CONFLICT (unique constraint)`);
    return res.status(409).json({ error: "A record with these details already exists.", code: "CONFLICT" });
  }
  if (anyErr?.code === "P2025") {
    console.error(`[error] ${ts} ${path} -> 404 NOT_FOUND (record missing)`);
    return res.status(404).json({ error: "Record not found.", code: "NOT_FOUND" });
  }

  console.error(`[error] ${ts} ${path} -> 500 INTERNAL`);
  console.error(err);
  res.status(500).json({
    error: safeMessage(err),
    code: "INTERNAL",
  });
}
