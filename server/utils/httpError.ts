// Typed HTTP error class and helpers for consistent API error responses.
export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "ERROR", details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new HttpError(400, msg, "BAD_REQUEST", details);
export const unauthorized = (msg = "Authentication required") =>
  new HttpError(401, msg, "UNAUTHORIZED");
export const forbidden = (msg = "You do not have permission to do that") =>
  new HttpError(403, msg, "FORBIDDEN");
export const notFound = (msg = "Resource not found") =>
  new HttpError(404, msg, "NOT_FOUND");
export const conflict = (msg: string) => new HttpError(409, msg, "CONFLICT");
export const serverError = (msg = "Internal server error") =>
  new HttpError(500, msg, "INTERNAL");
