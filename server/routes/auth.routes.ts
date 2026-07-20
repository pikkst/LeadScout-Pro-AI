// Authentication routes: register, login, logout, current user.
import { Router, type Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, conflict, forbidden, unauthorized } from "../utils/httpError";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole, signToken } from "../middleware/auth";
import { serializeUser } from "../utils/serializers";
import { logActivity } from "../utils/activity";
import { getAllowPublicRegistration } from "../services/settings.service";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(2, "Name is required").max(120),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]).optional(),
});

function setAuthCookie(res: Response, token: string) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Register a new user.
 * - The very first user in the system automatically becomes ADMIN.
 * - After that, registration requires either ADMIN privileges or ALLOW_PUBLIC_REGISTRATION=true.
 */
authRouter.post(
  "/register",
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body as z.infer<typeof registerSchema>;

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      // Determine whether the caller is an authenticated admin.
      let callerIsAdmin = false;
      const header = req.headers.authorization;
      const cookieToken = (req as any).cookies?.[config.cookieName];
      if (header?.startsWith("Bearer ") || cookieToken) {
        try {
          const jwt = (await import("jsonwebtoken")).default;
          const token = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;
          const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
          if (payload.sub) {
            const caller = await prisma.user.findUnique({ where: { id: payload.sub } });
            callerIsAdmin = caller?.role === "ADMIN" && caller.isActive;
          }
        } catch {
          /* ignore invalid token */
        }
      }
      if (!callerIsAdmin && !(await getAllowPublicRegistration())) {
        throw forbidden("New accounts must be created by an administrator.");
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("An account with this email already exists.");

    const passwordHash = await bcrypt.hash(password, 12);
    const assignedRole = isFirstUser ? "ADMIN" : role ?? "AGENT";

    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: assignedRole },
    });

    await logActivity({ action: "USER_REGISTERED", detail: `${email} (${assignedRole})`, userId: user.id });

    // Auto-login the first admin for a smooth setup experience.
    if (isFirstUser) {
      const token = signToken(user);
      setAuthCookie(res, token);
      return res.status(201).json({ user: serializeUser(user), token });
    }

    res.status(201).json({ user: serializeUser(user) });
  }),
);

authRouter.post(
  "/login",
  validate({ body: credentialsSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentialsSchema>;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw unauthorized("Invalid email or password.");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password.");

    const token = signToken(user);
    setAuthCookie(res, token);
    await logActivity({ action: "USER_LOGIN", detail: email, userId: user.id });

    res.json({ user: serializeUser(user), token });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie(config.cookieName);
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    res.json({ user: serializeUser(user) });
  }),
);

const updateMeSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

authRouter.patch(
  "/me",
  requireAuth,
  validate({ body: updateMeSchema }),
  asyncHandler(async (req, res) => {
    const { name, currentPassword, newPassword } = req.body as z.infer<typeof updateMeSchema>;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();

    const data: Record<string, unknown> = {};
    if (name) data.name = name;

    if (newPassword) {
      if (!currentPassword) throw badRequest("Current password is required to set a new password.");
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) throw badRequest("Current password is incorrect.");
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });
    res.json({ user: serializeUser(updated) });
  }),
);

// Convenience: admins can promote a demo of role restriction here later.
authRouter.get(
  "/team",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users.map(serializeUser));
  }),
);

// List all users (for dropdowns, assignment, etc.)
authRouter.get(
  "/users",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  }),
);
