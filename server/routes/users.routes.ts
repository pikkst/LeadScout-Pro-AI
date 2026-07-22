import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/httpError";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { serializeUser } from "../utils/serializers";
import { logActivity } from "../utils/activity";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("ADMIN"));

const createUserSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  name: z.string().min(2, "Name is required").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]).default("AGENT"),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().transform((v) => v.toLowerCase().trim()).optional(),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters").optional(),
});

usersRouter.get("/", asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  res.json(users.map(serializeUser));
}));

usersRouter.post("/", validate({ body: createUserSchema }), asyncHandler(async (req, res) => {
  const { email, name, password, role, isActive } = req.body as z.infer<typeof createUserSchema>;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role, isActive },
  });

  await logActivity({
    action: "USER_CREATED_BY_ADMIN",
    detail: `${email} (${role})`,
    userId: (req as any).user!.id,
  });

  res.status(201).json(serializeUser(user));
}));

usersRouter.patch("/:id", validate({ body: updateUserSchema }), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = typeof id === 'string' ? id : id[0];
  const { name, email, role, isActive, password } = req.body as z.infer<typeof updateUserSchema>;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound("User not found.");

  if (email && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) throw conflict("An account with this email already exists.");
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({ where: { id: userId }, data });

  await logActivity({
    action: "USER_UPDATED_BY_ADMIN",
    detail: `${updated.email} (${updated.role})`,
    userId: (req as any).user!.id,
  });

  res.json(serializeUser(updated));
}));

usersRouter.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = typeof id === 'string' ? id : id[0];
  const currentUserId = (req as any).user!.id;

  if (userId === currentUserId) throw badRequest("You cannot delete your own account.");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound("User not found.");

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isActive: false } }),
    prisma.apiKey.updateMany({ where: { userId }, data: { isRevoked: true } }),
  ]);

  await logActivity({
    action: "USER_DEACTIVATED_BY_ADMIN",
    detail: `${existing.email} (${existing.role})`,
    userId: currentUserId,
  });

  res.json({ ok: true, deactivated: true });
}));
