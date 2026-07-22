import { describe, expect, it } from "vitest";
import { Webhook } from "svix";
import { verifyResendWebhook, type RawBodyRequest } from "./resendWebhook";
import { extractHeaders, extractMessageIds } from "../routes/inbound.routes";
import { canBookAgentSlot } from "./calendarBooking";

function signedRequest(payload: string, secret: string): RawBodyRequest {
  const webhook = new Webhook(secret);
  const id = "msg_test_123";
  const timestamp = new Date();
  const headers: Record<string, string> = {
    "svix-id": id,
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": webhook.sign(id, timestamp, payload),
  };

  return {
    rawBody: payload,
    header: (name: string) => headers[name.toLowerCase()],
  } as RawBodyRequest;
}

describe("Resend webhook verification", () => {
  const secret = `whsec_${Buffer.from("review-fix-test-secret-32-bytes!").toString("base64")}`;
  const payload = JSON.stringify({ type: "email.received", data: { email_id: "email-1" } });

  it("accepts an authentic Svix signature", () => {
    expect(verifyResendWebhook(signedRequest(payload, secret), secret)).toEqual(JSON.parse(payload));
  });

  it("rejects a signature when the raw body is changed", () => {
    const req = signedRequest(payload, secret);
    req.rawBody = `${payload} `;
    expect(() => verifyResendWebhook(req, secret)).toThrow();
  });
});

describe("Inbound reply threading", () => {
  it("parses every message id from folded In-Reply-To and References headers", () => {
    const headers = extractHeaders([
      "From: lead@example.com",
      "In-Reply-To: <latest@example.com>",
      "References: <first@example.com> <second@example.com>",
      "  <latest@example.com>",
      "",
      "Email body",
    ].join("\r\n"));

    expect(extractMessageIds(headers, "in-reply-to", "references")).toEqual([
      "latest@example.com",
      "first@example.com",
      "second@example.com",
    ]);
  });
});

describe("calendar booking authorization", () => {
  const agent = { id: "agent-1", email: "a@example.com", name: "Agent", role: "AGENT" as const };

  it("allows an agent to book their own slot", () => {
    expect(canBookAgentSlot(agent, "agent-1")).toBe(true);
  });

  it("prevents an agent from booking another agent's slot", () => {
    expect(canBookAgentSlot(agent, "agent-2")).toBe(false);
  });

  it("allows managers to book another agent's slot", () => {
    expect(canBookAgentSlot({ ...agent, role: "MANAGER" }, "agent-2")).toBe(true);
  });
});
