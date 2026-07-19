// Global error handler + 404 handler. Produces consistent JSON error responses.
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/httpError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma unique-constraint and known errors surface as 409/400 where useful.
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === "P2002") {
    return res.status(409).json({ error: "A record with these details already exists.", code: "CONFLICT" });
  }
  if (anyErr?.code === "P2025") {
    return res.status(404).json({ error: "Record not found.", code: "NOT_FOUND" });
  }

  console.error("[error]", err);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL",
  });
}
