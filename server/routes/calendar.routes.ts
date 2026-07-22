// Calendar & Meeting scheduling routes
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, forbidden, notFound } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { param } from "../utils/param";
import { logActivity } from "../utils/activity";
import { canBookAgentSlot, canCancelMeeting } from "../utils/calendarBooking";
import { bookMeetingSlot, cancelMeeting, saveAgentAvailability, timeToMinutes } from "../services/calendar.service";
import { sendBookingConfirmationEmail, sendMeetingNotificationEmail } from "../services/email.service";
import { recordActivationEvent } from "../services/activation.service";
import { stopSequencesForLead } from "../services/sequenceStop.service";

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  agentId: z.string().min(1),
}).refine((slot) => timeToMinutes(slot.endTime) > timeToMinutes(slot.startTime), {
  message: "End time must be after start time",
});

const meetingSchema = z.object({
  leadId: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string(),
  duration: z.coerce.number().min(15).max(120).default(30),
  type: z.enum(["CALL", "MEETING", "DEMO", "FOLLOW_UP"]).default("CALL"),
  agenda: z.string().optional().default(""),
  pitchId: z.string().min(1).optional().nullable(),
});

const bookSlotSchema = z.object({
  slotId: z.string().min(1),
  leadId: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  agenda: z.string().optional().default(""),
  pitchId: z.string().min(1).optional().nullable(),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format");
const timezoneSchema = z.string().min(1).max(80).refine((value) => {
  if (/[\r\n]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "Use a valid IANA time zone");
const availabilitySchema = z.object({
  agentId: z.string().min(1).optional(),
  startDate: dateSchema,
  weeks: z.number().int().min(1).max(26).default(12),
  slotDuration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).default(30),
  timezone: timezoneSchema.default("Europe/Tallinn"),
  days: z.array(z.object({
    weekday: z.number().int().min(1).max(7),
    startTime: timeSchema,
    endTime: timeSchema,
  }).refine((day) => timeToMinutes(day.endTime) > timeToMinutes(day.startTime), {
    message: "End time must be after start time",
  })).min(1).max(7).refine((days) => new Set(days.map((day) => day.weekday)).size === days.length, {
    message: "Each weekday may be configured only once",
  }),
});

const bulkSlotSchema = z.object({
  agentId: z.string().min(1),
  startDate: dateSchema,
  endDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  interval: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).default(30),
}).refine((value) => value.endDate >= value.startDate, {
  message: "End date must not be before start date",
}).refine((value) => timeToMinutes(value.endTime) > timeToMinutes(value.startTime), {
  message: "End time must be after start time",
});

// ---- List available slots for booking ----
calendarRouter.get("/slots", asyncHandler(async (req, res) => {
  const { agentId, date, startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {
    isAvailable: true,
    isBooked: false,
  };

  if (agentId) where.agentId = agentId;
  if (date) where.date = date;
  else where.date = { gte: startDate || new Date().toISOString().slice(0, 10), ...(endDate ? { lte: endDate } : {}) };

  const slots = await prisma.meetingSlot.findMany({
    where,
    include: { agent: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  res.json(slots);
}));

calendarRouter.get("/availability", asyncHandler(async (req, res) => {
  const requestedAgentId = typeof req.query.agentId === "string" ? req.query.agentId : req.user!.id;
  const rules = await prisma.availabilityRule.findMany({
    where: { agentId: requestedAgentId, isActive: true },
    orderBy: { weekday: "asc" },
  });
  res.json(rules);
}));

calendarRouter.post("/availability", asyncHandler(async (req, res) => {
  const body = availabilitySchema.parse(req.body);
  if (body.startDate < new Date().toISOString().slice(0, 10)) {
    throw badRequest("Availability cannot start in the past.");
  }
  const agentId = body.agentId || req.user!.id;
  if (agentId !== req.user!.id && !["ADMIN", "MANAGER"].includes(req.user!.role)) {
    throw forbidden("Only managers can update another user's availability.");
  }
  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { id: true } });
  if (!agent) throw notFound("Agent not found");

  const result = await saveAgentAvailability({
    agentId,
    startDate: body.startDate,
    weeks: body.weeks ?? 12,
    slotDuration: body.slotDuration ?? 30,
    timezone: body.timezone ?? "Europe/Tallinn",
    days: body.days.map((day) => ({
      weekday: day.weekday,
      startTime: day.startTime,
      endTime: day.endTime,
    })),
  });
  await logActivity({
    action: "AVAILABILITY_UPDATED",
    detail: `${body.days.length} weekly work days, ${result.slotsCreated} slots generated through ${result.endDate}`,
    userId: agentId,
  });
  await recordActivationEvent({ type: "AVAILABILITY_PUBLISHED", userId: agentId, metadata: { slotsCreated: result.slotsCreated } });
  res.json(result);
}));

// ---- Create meeting slot (agent sets availability) ----
calendarRouter.post("/slots", asyncHandler(async (req, res) => {
  const data = slotSchema.parse(req.body);
  if (data.date < new Date().toISOString().slice(0, 10)) throw badRequest("Past slots cannot be created.");
  if (!canBookAgentSlot(req.user!, data.agentId)) {
    throw forbidden("Only managers can create slots for another user.");
  }

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
  const { agentId, startDate, endDate, startTime, endTime, interval } = bulkSlotSchema.parse(req.body);
  if (startDate < new Date().toISOString().slice(0, 10)) throw badRequest("Past slots cannot be created.");
  if (!canBookAgentSlot(req.user!, agentId)) {
    throw forbidden("Only managers can create slots for another user.");
  }

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

  const created = await prisma.meetingSlot.createMany({ data: slots, skipDuplicates: true });

  res.json({ created: created.count, slots });
}));

// ---- Book a slot and create meeting ----
calendarRouter.post("/book", asyncHandler(async (req, res) => {
  const { slotId, leadId, title, agenda, pitchId } = bookSlotSchema.parse(req.body);

  const slot = await prisma.meetingSlot.findUnique({ where: { id: slotId } });
  if (!slot || !slot.isAvailable || slot.isBooked) throw notFound("Slot not available");
  if (!canBookAgentSlot(req.user!, slot.agentId)) {
    throw forbidden("Only the slot owner or a manager can book this slot.");
  }

  const booked = await bookMeetingSlot({ slotId, leadId, title, agenda, pitchId, expectedAgentId: slot.agentId });
  const { meeting, lead } = booked;
  await recordActivationEvent({ type: "BOOKING_COMPLETED", userId: slot.agentId, leadId, pitchId: pitchId ?? undefined, metadata: { source: "WORKSPACE" } });
  void stopSequencesForLead(leadId, "MEETING").catch((err) => console.error("[calendar] stopSequencesForLead failed", err));

  await logActivity({
    action: "MEETING_BOOKED",
    detail: `${meeting.title} on ${meeting.date} ${meeting.time} (agent: ${slot.agentId})`,
    userId: req.user!.id,
    leadId,
  });

  await logActivity({
    action: "YOUR_SLOT_BOOKED",
    detail: `${meeting.title} on ${meeting.date} ${meeting.time} with ${lead.email}`,
    userId: slot.agentId,
    leadId,
  });

  const agent = meeting.agent;
  if (agent?.email) {
    void sendMeetingNotificationEmail({
      to: agent.email,
      agentName: agent.name,
      leadName: lead.name,
      leadEmail: lead.email,
      date: meeting.date,
      time: meeting.time,
      title: meeting.title,
      meetingId: meeting.id,
      duration: meeting.duration,
      timezone: meeting.timezone,
    }).catch((error) => console.error("[calendar] Failed to send agent meeting notification:", error));
  }
  void sendBookingConfirmationEmail({
    to: lead.email,
    attendeeName: lead.name,
    agentName: agent?.name || "your account manager",
    meetingId: meeting.id,
    title: meeting.title,
    date: meeting.date,
    time: meeting.time,
    duration: meeting.duration,
    timezone: meeting.timezone,
  }).catch((error) => console.error("[calendar] Failed to send attendee booking confirmation:", error));

  res.status(201).json({ ...meeting, agentName: agent?.name ?? null, previousStage: booked.previousStage, nextStage: booked.nextStage });
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
    include: {
      agent: { select: { name: true } },
      lead: { select: { name: true, email: true } },
    },
    orderBy: { date: "asc" },
  });

  res.json(meetings.map((m) => ({
    ...m,
    agentName: m.agent?.name ?? null,
  })));
}));

// ---- Cancel meeting ----
calendarRouter.delete("/meetings/:id", asyncHandler(async (req, res) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: param(req, "id") },
    include: { slots: { select: { agentId: true }, take: 1 } },
  });
  if (!meeting) throw notFound("Meeting not found");
  if (!canCancelMeeting(req.user!, meeting)) throw forbidden("You cannot cancel this meeting.");

  await cancelMeeting(meeting.id);

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
