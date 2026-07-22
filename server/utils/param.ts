// Reject ambiguous/missing route parameters instead of silently selecting an
// array element. This keeps untrusted route input type-safe at every caller.
import type { Request } from "express";
import { badRequest } from "./httpError";

export function param(req: Request, name: string): string {
  const value: unknown = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw badRequest(`Invalid ${name} route parameter.`);
  }
  return value;
}
