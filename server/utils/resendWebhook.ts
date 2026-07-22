import type { Request } from "express";
import { Webhook } from "svix";

export type RawBodyRequest = Request & { rawBody?: string };

/** Verify a Resend/Svix webhook against the exact bytes received by Express. */
export function verifyResendWebhook(req: RawBodyRequest, secret: string): unknown {
  const id = req.header("svix-id");
  const timestamp = req.header("svix-timestamp");
  const signature = req.header("svix-signature");
  const payload = req.rawBody;

  if (!id || !timestamp || !signature || payload === undefined) {
    throw new Error("Missing Resend webhook signature headers or raw body");
  }

  return new Webhook(secret).verify(payload, {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": signature,
  });
}
