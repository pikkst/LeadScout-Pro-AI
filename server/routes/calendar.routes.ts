// Calendar & Meeting scheduling routes
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { param } from "../utils/param";

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

const slotSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  agentId: z.string(),
});

const meetingSchema = z.object({
  leadId: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string(),
  duration: z.coerce.number().min(15).max(120).default(30),
  type: z.enum(["CALL", "MEETING", "DEMO", "FOLLOW_UP"]).default("CALL"),
  agenda: z.string().default(""),
  agentId: z.string(),
});

// ---- List available slots for booking ----
calendarRouter.get("/slots", asyncHandler(async (req, res) => {
  const { agentId, date } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {
    isAvailable: true,
    isBooked: false,
  };

  if (agentId) where.agentId = agentId;
  if (date) where.date = date;

  const slots = await prisma.meetingSlot.findMany({
    where,
    include: { agent: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  res.json(slots);
}));

// ---- Create meeting slot (agent sets availability) ----
calendarRouter.post("/slots", asyncHandler(async (req, res) => {
  const data = slotSchema.parse(req.body);

  const agent = await prisma.user.findUnique({ where: { id: data.agentId } });
  if (!agent) throw notFound("Agent not found");

  const slot = await prisma.meetingSlot.create({
    data: data as any,
    include: { agent: { select: { name: true } } },
  });

  res.json(slot);
}));

// ---- Bulk create slots for a week ----
calendarRouter.post("/slots/bulk", asyncHandler(async (req, res) => {
  const { agentId, startDate, endDate, startTime, endTime, interval = 30 } = req.body as {
    agentId: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    interval?: number;
  };

  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent) throw notFound("Agent not found");

  const slots: { date: string; startTime: string; endTime: string; agentId: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return res.json({ created: 0, slots: [] });
  }

  let current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    let [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    while (sh < eh || (sh === eh && sm < em)) {
      const slotStart = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
      const nextMin = sm + interval;
      const nextH = sh + Math.floor(nextMin / 60);
      const nextM = nextMin % 60;
      const slotEnd = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;

      if (nextH > eh || (nextH === eh && nextM > em)) break;

      slots.push({ date: dateStr, startTime: slotStart, endTime: slotEnd, agentId });

      sh = nextH;
      sm = nextM;
    }

    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  const created = await prisma.meetingSlot.createMany({ data: slots });

  res.json({ created: created.count, slots });
}));

// ---- Book a slot and create meeting ----
calendarRouter.post("/book", asyncHandler(async (req, res) => {
  const { slotId, leadId, title, agenda } = req.body as {
    slotId: string;
    leadId: string;
    title: string;
    agenda?: string;
  };

  const slot = await prisma.meetingSlot.findUnique({ where: { id: slotId } });
  if (!slot || !slot.isAvailable || slot.isBooked) throw notFound("Slot not available");

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw notFound("Lead not found");

  const meeting = await prisma.meeting.create({
    data: {
      leadId,
      title: title || `Meeting with ${lead.name}`,
      date: slot.date,
      time: slot.startTime,
      agenda: agenda || "",
      type: "MEETING",
    },
  });

  await prisma.meetingSlot.update({
    where: { id: slotId },
    data: { isBooked: true, meetingId: meeting.id },
  });

  res.json(meeting);
}));

// ---- List meetings ----
calendarRouter.get("/meetings", asyncHandler(async (req, res) => {
  const { agentId, leadId } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (agentId) {
    // Find slots for agent and get their meetings
    const slots = await prisma.meetingSlot.findMany({
      where: { agentId },
      select: { meetingId: true },
    });
    const meetingIds = slots.filter(s => s.meetingId).map(s => s.meetingId!);
    where.id = { in: meetingIds };
  }
  if (leadId) where.leadId = leadId;

  const meetings = await prisma.meeting.findMany({
    where,
    include: { lead: { select: { name: true, email: true } } },
    orderBy: { date: "asc" },
  });

  res.json(meetings);
}));

// ---- Cancel meeting ----
calendarRouter.delete("/meetings/:id", asyncHandler(async (req, res) => {
  const meeting = await prisma.meeting.findUnique({ where: { id: param(req, "id") } });
  if (!meeting) throw notFound("Meeting not found");

  // Free up the slot
  const slot = await prisma.meetingSlot.findFirst({
    where: { meetingId: meeting.id },
  });

  await prisma.meeting.delete({ where: { id: param(req, "id") } });

  if (slot) {
    await prisma.meetingSlot.update({
      where: { id: slot.id },
      data: { isBooked: false, meetingId: null },
    });
  }

  res.json({ success: true });
}));

// ---- My slots (for logged-in agent) ----
calendarRouter.get("/my-slots", asyncHandler(async (req, res) => {
  const slots = await prisma.meetingSlot.findMany({
    where: { agentId: req.user!.id },
    orderBy: { date: "asc" },
  });

  res.json(slots);
}));
