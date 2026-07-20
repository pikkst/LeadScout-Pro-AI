// Pitch event routes: list events for a pitch (sent, delivered, opened, etc.).
// All routes require authentication.
import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { param } from "../utils/param";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

eventsRouter.get(
  "/pitch/:pitchId",
  asyncHandler(async (req, res) => {
    const events = await prisma.pitchEvent.findMany({
      where: { pitchId: param(req, "pitchId") },
      orderBy: { createdAt: "desc" },
    });
    res.json(events);
  }),
);
