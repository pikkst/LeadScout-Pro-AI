// Authentication routes: register, login, logout, current user.
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
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

function setSessionCookie(res: import("express").Response, token: string) {
  const secure = config.isProduction ? "; Secure" : "";
  res.setHeader("Set-Cookie", `unitel_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/${secure}`);
}

function clearSessionCookie(res: import("express").Response) {
  const secure = config.isProduction ? "; Secure" : "";
  res.setHeader("Set-Cookie", `unitel_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later.", code: "RATE_LIMITED" },
});

const credentialsSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().min(2, "Name is required").max(120),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]).optional(),
});

/**
 * Register a new user.
 * - The very first user in the system automatically becomes ADMIN.
 * - After that, registration requires either ADMIN privileges or ALLOW_PUBLIC_REGISTRATION=true.
 */
authRouter.post(
  "/register",
  credentialLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body as z.infer<typeof registerSchema>;

    let callerIsAdmin = false;
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        const jwt = (await import("jsonwebtoken")).default;
        const token = header.slice(7);
        const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
        if (payload.sub) {
          const caller = await prisma.user.findUnique({ where: { id: payload.sub } });
          callerIsAdmin = caller?.role === "ADMIN" && caller.isActive;
        }
      } catch {
        /* ignore invalid token */
      }
    }
    const publicRegistrationAllowed = await getAllowPublicRegistration();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      // Serialize bootstrap registration so two concurrent requests cannot both
      // observe an empty users table and create separate first administrators.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(847263519)`;
      const isFirstUser = (await tx.user.count()) === 0;
      if (!isFirstUser && !callerIsAdmin && !publicRegistrationAllowed) {
        throw forbidden("New accounts must be created by an administrator.");
      }
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) throw conflict("An account with this email already exists.");
      const assignedRole = isFirstUser ? "ADMIN" : callerIsAdmin ? role ?? "AGENT" : "AGENT";
      const user = await tx.user.create({ data: { email, name, passwordHash, role: assignedRole } });
      return { user, isFirstUser, assignedRole };
    });
    const { user, isFirstUser, assignedRole } = result;

    await logActivity({ action: "USER_REGISTERED", detail: `${email} (${assignedRole})`, userId: user.id });

    // Auto-login the first admin for a smooth setup experience.
    if (isFirstUser) {
      const token = signToken(user);
      if (req.get("x-auth-mode") === "bearer") return res.status(201).json({ user: serializeUser(user), token });
      setSessionCookie(res, token);
      return res.status(201).json({ user: serializeUser(user), autoLoggedIn: true });
    }

    res.status(201).json({ user: serializeUser(user) });
  }),
);

authRouter.post(
  "/login",
  credentialLimiter,
  validate({ body: credentialsSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentialsSchema>;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw unauthorized("Invalid email or password.");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password.");

    const token = signToken(user);
    await logActivity({ action: "USER_LOGIN", detail: email, userId: user.id });

    if (req.get("x-auth-mode") === "bearer") return res.json({ user: serializeUser(user), token });
    setSessionCookie(res, token);
    res.json({ user: serializeUser(user) });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
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
  newPassword: z.string().min(8).max(128).optional(),
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

// Notifications: recent activity log entries for the current user
authRouter.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const activities = await prisma.activityLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        detail: true,
        createdAt: true,
        leadId: true,
        readAt: true,
      },
    });

    const notifications = activities.map((activity) => ({
      id: activity.id,
      message: `${activity.action}${activity.detail ? `: ${activity.detail}` : ""}`,
      timestamp: activity.createdAt.toISOString(),
      read: activity.readAt !== null,
      leadId: activity.leadId,
    }));

    res.json(notifications);
  }),
);

authRouter.patch(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await prisma.activityLog.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ updated: result.count });
  }),
);
