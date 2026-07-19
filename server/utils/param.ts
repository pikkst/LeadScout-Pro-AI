// Express 5 types can widen route params to `string | string[]`.
// This helper safely returns a single string value.
import type { Request } from "express";

export function param(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[]>)[name];
  return Array.isArray(value) ? value[0] : value;
}
