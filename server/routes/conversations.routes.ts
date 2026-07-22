import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { syncConversationsForUser } from "../services/gmailSync.service";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get("/", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { accountId, contactId, leadId } = req.query as Record<string, string | undefined>;

  const where: Record<string, unknown> = { ownerId: userId };
  if (accountId) where.accountId = accountId;
  if (contactId) where.contactId = contactId;
  if (leadId) where.legacyLeadId = leadId as string;

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      messages: { orderBy: { occurredAt: "asc" }, take: 1 },
      connection: { select: { provider: true, accountEmail: true } },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  res.json(conversations);
}));

conversationsRouter.get("/:id", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id as string, ownerId: userId as string },
    include: {
      messages: { orderBy: { occurredAt: "asc" } },
      connection: { select: { provider: true, accountEmail: true } },
    },
  });
  if (!conversation) throw notFound("Conversation not found.");
  res.json(conversation);
}));

conversationsRouter.post("/:id/read", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  await prisma.conversationMessage.updateMany({
    where: { conversationId: id, isRead: false },
    data: { isRead: true },
  });
  await prisma.conversation.updateMany({
    where: { id, ownerId: userId as string },
    data: { unreadCount: 0 },
  });
  res.json({ ok: true });
}));

conversationsRouter.post("/sync", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const result = await syncConversationsForUser(userId);
  res.json(result);
}));
