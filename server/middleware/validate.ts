// Zod validation middleware. Validates body/query/params and replaces them with parsed data.
import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { badRequest } from "../utils/httpError";

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        next(badRequest("Validation failed", details));
      } else {
        next(err);
      }
    }
  };
}
