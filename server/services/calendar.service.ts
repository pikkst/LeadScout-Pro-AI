import crypto from "crypto";
import { prisma } from "../db";
import { badRequest, conflict, notFound } from "../utils/httpError";
import { config } from "../config";

export interface AvailabilityDay {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface GeneratedSlot {
  agentId: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function currentDateTimeInZone(timezone: string, now = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export function generateAvailabilitySlots(input: {
  agentId: string;
  startDate: string;
  weeks: number;
  slotDuration: number;
  days: AvailabilityDay[];
  timezone?: string;
}): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  const dayMap = new Map(input.days.map((day) => [day.weekday, day]));

  for (let offset = 0; offset < input.weeks * 7; offset += 1) {
    const date = addDays(input.startDate, offset);
    const parsed = new Date(`${date}T00:00:00.000Z`);
    const weekday = parsed.getUTCDay() === 0 ? 7 : parsed.getUTCDay();
    const rule = dayMap.get(weekday);
    if (!rule) continue;

    const start = timeToMinutes(rule.startTime);
    const end = timeToMinutes(rule.endTime);
    for (let cursor = start; cursor + input.slotDuration <= end; cursor += input.slotDuration) {
      slots.push({
        agentId: input.agentId,
        date,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + input.slotDuration),
        timezone: input.timezone || "Europe/Tallinn",
      });
    }
  }

  return slots;
}

export function getNextLeadStage(stage: string): string | null {
  if (stage === "DISCOVERED") return "CONTACTED";
  if (stage === "CONTACTED") return "NEGOTIATION";
  return null;
}

export async function saveAgentAvailability(input: {
  agentId: string;
  startDate: string;
  weeks: number;
  slotDuration: number;
  timezone: string;
  days: AvailabilityDay[];
}) {
  const slots = generateAvailabilitySlots(input);
  const endDate = addDays(input.startDate, input.weeks * 7 - 1);

  return prisma.$transaction(async (tx) => {
    await tx.availabilityRule.updateMany({
      where: { agentId: input.agentId },
      data: { isActive: false },
    });

    for (const day of input.days) {
      await tx.availabilityRule.upsert({
        where: { agentId_weekday: { agentId: input.agentId, weekday: day.weekday } },
        update: {
          startTime: day.startTime,
          endTime: day.endTime,
          slotDuration: input.slotDuration,
          timezone: input.timezone,
          isActive: true,
        },
        create: {
          agentId: input.agentId,
          weekday: day.weekday,
          startTime: day.startTime,
          endTime: day.endTime,
          slotDuration: input.slotDuration,
          timezone: input.timezone,
        },
      });
    }

    await tx.meetingSlot.deleteMany({
      where: {
        agentId: input.agentId,
        date: { gte: input.startDate, lte: endDate },
        isBooked: false,
      },
    });

    const created = await tx.meetingSlot.createMany({ data: slots, skipDuplicates: true });
    const rules = await tx.availabilityRule.findMany({
      where: { agentId: input.agentId, isActive: true },
      orderBy: { weekday: "asc" },
    });

    return { rules, slotsCreated: created.count, startDate: input.startDate, endDate };
  });
}

export async function getOrCreateBookingLink(input: { pitchId: string; leadId: string; agentId: string }) {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 180);

  const link = await prisma.bookingLink.upsert({
    where: { pitchId: input.pitchId },
    update: { leadId: input.leadId, agentId: input.agentId, expiresAt },
    create: {
      ...input,
      token: crypto.randomBytes(32).toString("base64url"),
      expiresAt,
    },
  });

  return { ...link, url: `${config.baseUrl.replace(/\/$/, "")}/book/${link.token}` };
}

export async function bookMeetingSlot(input: {
  slotId: string;
  leadId: string;
  title: string;
  agenda?: string;
  pitchId?: string | null;
  expectedAgentId?: string;
  bookingLinkId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.bookingLinkId) {
      const claimedLink = await tx.bookingLink.updateMany({
        where: { id: input.bookingLinkId, bookedAt: null, expiresAt: { gt: new Date() } },
        data: { bookedAt: new Date() },
      });
      if (claimedLink.count !== 1) throw conflict("This booking link has already been used or has expired.");
    }

    const slot = await tx.meetingSlot.findUnique({
      where: { id: input.slotId },
      include: { agent: { select: { id: true, name: true, email: true } } },
    });
    if (!slot || !slot.isAvailable || slot.isBooked) throw conflict("This time is no longer available.");
    if (input.expectedAgentId && slot.agentId !== input.expectedAgentId) {
      throw badRequest("The selected time does not belong to this booking link.");
    }
    const current = currentDateTimeInZone(slot.timezone);
    if (slot.date < current.date || (slot.date === current.date && slot.startTime <= current.time)) {
      throw badRequest("Past time slots cannot be booked.");
    }

    const lead = await tx.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw notFound("Lead not found");

    const claimed = await tx.meetingSlot.updateMany({
      where: { id: slot.id, isAvailable: true, isBooked: false },
      data: { isBooked: true },
    });
    if (claimed.count !== 1) throw conflict("This time was just booked by someone else.");

    const duration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
    const meeting = await tx.meeting.create({
      data: {
        leadId: lead.id,
        title: input.title || `Meeting with ${lead.name}`,
        date: slot.date,
        time: slot.startTime,
        duration,
        timezone: slot.timezone,
        agenda: input.agenda || "",
        type: "MEETING",
        agentId: slot.agentId,
        pitchId: input.pitchId ?? null,
      },
      include: {
        agent: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.meetingSlot.update({ where: { id: slot.id }, data: { meetingId: meeting.id } });
    if (input.bookingLinkId) {
      await tx.bookingLink.update({ where: { id: input.bookingLinkId }, data: { meetingId: meeting.id } });
    }

    const nextStage = getNextLeadStage(lead.stage);
    if (nextStage) {
      await tx.lead.update({
        where: { id: lead.id },
        data: { stage: nextStage, lastContactedAt: new Date() },
      });
    }

    return { meeting, slot, lead, previousStage: lead.stage, nextStage };
  });
}

export async function cancelMeeting(meetingId: string) {
  return prisma.$transaction(async (tx) => {
    const meeting = await tx.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw notFound("Meeting not found");
    const slot = await tx.meetingSlot.findFirst({ where: { meetingId } });
    const bookingLink = await tx.bookingLink.findUnique({ where: { meetingId } });
    await tx.meeting.delete({ where: { id: meetingId } });
    if (slot) {
      await tx.meetingSlot.update({
        where: { id: slot.id },
        data: { isBooked: false, meetingId: null },
      });
    }
    if (bookingLink && bookingLink.expiresAt > new Date()) {
      await tx.bookingLink.update({
        where: { id: bookingLink.id },
        data: { meetingId: null, bookedAt: null },
      });
    }
    return meeting;
  });
}
