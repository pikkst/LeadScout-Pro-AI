import { describe, expect, it } from "vitest";
import { generateAvailabilitySlots, getNextLeadStage } from "./calendar.service";
import { appendBookingCallToAction, buildIcsEvent } from "./email.service";

describe("weekly calendar availability", () => {
  it("generates Monday-to-Friday work slots for the requested number of weeks", () => {
    const slots = generateAvailabilitySlots({
      agentId: "agent-1",
      startDate: "2026-07-27",
      weeks: 1,
      slotDuration: 60,
      days: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "08:00", endTime: "17:00" })),
    });

    expect(slots).toHaveLength(45);
    expect(slots[0]).toEqual({
      agentId: "agent-1",
      date: "2026-07-27",
      startTime: "08:00",
      endTime: "09:00",
      timezone: "Europe/Tallinn",
    });
    expect(slots.at(-1)?.date).toBe("2026-07-31");
    expect(slots.at(-1)?.endTime).toBe("17:00");
  });

  it("never creates a slot that extends beyond working hours", () => {
    const slots = generateAvailabilitySlots({
      agentId: "agent-1",
      startDate: "2026-07-27",
      weeks: 1,
      slotDuration: 45,
      days: [{ weekday: 1, startTime: "08:00", endTime: "09:00" }],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].endTime).toBe("08:45");
  });
});

describe("booking workflow", () => {
  it("advances early pipeline stages after a booking", () => {
    expect(getNextLeadStage("DISCOVERED")).toBe("CONTACTED");
    expect(getNextLeadStage("CONTACTED")).toBe("NEGOTIATION");
    expect(getNextLeadStage("NEGOTIATION")).toBeNull();
  });

  it("adds a secure booking call-to-action to HTML and text emails", () => {
    const result = appendBookingCallToAction(
      "<html><body><p>Hello</p></body></html>",
      "Hello",
      "https://example.com/book/token",
    );
    expect(result.html).toContain("Book a meeting");
    expect(result.html.indexOf("Book a meeting")).toBeLessThan(result.html.indexOf("</body>"));
    expect(result.text).toContain("https://example.com/book/token");
  });

  it("builds an ICS invitation compatible with calendar applications", () => {
    const event = buildIcsEvent({
      meetingId: "meeting-1",
      title: "Carrier meeting",
      date: "2026-07-27",
      time: "08:00",
      duration: 30,
      description: "Discuss routes",
    });
    expect(event).toContain("METHOD:REQUEST");
    expect(event).toContain("DTSTART;TZID=Europe/Tallinn:20260727T080000");
    expect(event).toContain("DTEND;TZID=Europe/Tallinn:20260727T083000");
    expect(event).toContain("UID:meeting-1@leadscout");
  });
});
