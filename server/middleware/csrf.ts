// Simple CSRF protection using double-submit cookie pattern.
// Stores a token in a non-HTTP-only cookie and validates it from the
// X-CSRF-Token header on state-changing requests.
import crypto from "crypto";

const CSRF_COOKIE = "x-csrf-token";
const CSRF_HEADER = "x-csrf-token";

export function csrfProtection(req: any, res: any, next: any) {
  let token = req.cookies?.[CSRF_COOKIE];

  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  const method = req.method;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const headerToken = req.header(CSRF_HEADER);
    if (!headerToken || headerToken !== token) {
      return res.status(403).json({ error: "Invalid CSRF token", code: "CSRF" });
    }
  }

  next();
}

export function getCsrfToken(req: any): string | undefined {
  return req.cookies?.[CSRF_COOKIE];
}
