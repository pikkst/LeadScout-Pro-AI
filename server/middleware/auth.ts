// JWT authentication + role-based authorization middleware.
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { forbidden, unauthorized } from "../utils/httpError";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "AGENT";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: { id: string }): string {
  return jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    config.cookieName
  ];
  return cookieToken ?? null;
}

/** Requires a valid token and an active user. Attaches req.user. */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) throw unauthorized();

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    throw unauthorized("Invalid or expired session");
  }

  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) throw unauthorized("Invalid session");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw unauthorized("Account not found or deactivated");

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
});

/** Restricts a route to specific roles. Use after requireAuth. */
export function requireRole(...roles: Array<AuthUser["role"]>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
