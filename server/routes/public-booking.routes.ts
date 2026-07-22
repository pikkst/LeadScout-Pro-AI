import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, notFound } from "../utils/httpError";
import { bookMeetingSlot, currentDateTimeInZone } from "../services/calendar.service";
import { logActivity } from "../utils/activity";
import { sendBookingConfirmationEmail, sendMeetingNotificationEmail } from "../services/email.service";
import { recordActivationEvent } from "../services/activation.service";

export const publicBookingRouter = Router();

publicBookingRouter.use(rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many booking requests. Please try again shortly.", code: "RATE_LIMITED" },
}));

const tokenSchema = z.string().min(32).max(128);
const parseToken = (value: string) => {
  const result = tokenSchema.safeParse(value);
  if (!result.success) throw badRequest("Invalid booking link.");
  return result.data;
};
const publicBookingSchema = z.object({
  slotId: z.string().min(1),
  agenda: z.string().max(2000).optional().default(""),
});
const parseBooking = (value: unknown) => {
  const result = publicBookingSchema.safeParse(value);
  if (!result.success) throw badRequest("Invalid booking request.", result.error.flatten());
  return result.data;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "invited recipient";
  return `${local.slice(0, 2)}***@${domain}`;
}

function endTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = hours * 60 + minutes + duration;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

async function getActiveBookingLink(token: string) {
  const link = await prisma.bookingLink.findUnique({
    where: { token },
    include: {
      agent: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, email: true } },
      pitch: { select: { id: true, subject: true } },
      meeting: { select: { id: true, title: true, date: true, time: true, duration: true, timezone: true } },
    },
  });
  if (!link || link.expiresAt <= new Date()) throw notFound("This booking link is invalid or has expired.");
  return link;
}

publicBookingRouter.get("/:token", asyncHandler(async (req, res) => {
  const token = parseToken(String(req.params.token));
  const link = await getActiveBookingLink(token);
  if (link.bookedAt && link.meeting) {
    return res.json({
      booked: true,
      host: { name: link.agent.name },
      attendee: { name: link.lead.name, emailMasked: maskEmail(link.lead.email) },
      meeting: {
        ...link.meeting,
        endTime: endTime(link.meeting.time, link.meeting.duration),
        hostName: link.agent.name,
      },
      slots: [],
    });
  }
  const today = new Date().toISOString().slice(0, 10);
  const slots = await prisma.meetingSlot.findMany({
    where: {
      agentId: link.agentId,
      date: { gte: today },
      isAvailable: true,
      isBooked: false,
    },
    select: { id: true, date: true, startTime: true, endTime: true, timezone: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 500,
  });

  const availableSlots = slots.filter((slot) => {
    const current = currentDateTimeInZone(slot.timezone);
    return slot.date > current.date || (slot.date === current.date && slot.startTime > current.time);
  });

  res.json({
    host: { name: link.agent.name },
    attendee: { name: link.lead.name, emailMasked: maskEmail(link.lead.email) },
    meetingTitle: link.pitch.subject,
    expiresAt: link.expiresAt.toISOString(),
    timezone: availableSlots[0]?.timezone || "Europe/Tallinn",
    slots: availableSlots,
  });
}));

publicBookingRouter.post("/:token", asyncHandler(async (req, res) => {
  const token = parseToken(String(req.params.token));
  const body = parseBooking(req.body);
  const link = await getActiveBookingLink(token);
  const booked = await bookMeetingSlot({
    slotId: body.slotId,
    leadId: link.leadId,
    title: `Meeting with ${link.lead.name}`,
    agenda: body.agenda,
    pitchId: link.pitchId,
    expectedAgentId: link.agentId,
    bookingLinkId: link.id,
  });

  const { meeting, lead, slot } = booked;
  await recordActivationEvent({ type: "BOOKING_COMPLETED", userId: link.agentId, leadId: link.leadId, pitchId: link.pitchId, metadata: { source: "PUBLIC_LINK" } });
  await logActivity({
    action: "PUBLIC_MEETING_BOOKED",
    detail: `${meeting.title} on ${meeting.date} ${meeting.time} with ${lead.email}`,
    userId: link.agentId,
    leadId: link.leadId,
  });
  void Promise.all([
    sendMeetingNotificationEmail({
      to: link.agent.email,
      agentName: link.agent.name,
      leadName: lead.name,
      leadEmail: lead.email,
      date: meeting.date,
      time: meeting.time,
      title: meeting.title,
      meetingId: meeting.id,
      duration: meeting.duration,
      timezone: meeting.timezone,
    }),
    sendBookingConfirmationEmail({
      to: lead.email,
      attendeeName: lead.name,
      agentName: link.agent.name,
      meetingId: meeting.id,
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      duration: meeting.duration,
      timezone: meeting.timezone,
    }),
  ]).catch((error) => console.error("[booking] Failed to send one or more confirmation emails:", error));

  res.status(201).json({
    booked: true,
    meeting: {
      id: meeting.id,
      title: meeting.title,
      date: slot.date,
      time: slot.startTime,
      endTime: slot.endTime,
      duration: meeting.duration,
      hostName: link.agent.name,
      timezone: meeting.timezone,
    },
    previousStage: booked.previousStage,
    nextStage: booked.nextStage,
  });
}));
