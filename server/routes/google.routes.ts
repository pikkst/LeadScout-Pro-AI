import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, notFound } from "../utils/httpError";
import { getSetting } from "../services/settings.service";
import { getValidAccessToken } from "../services/google.service";

export const googleRouter = Router();

googleRouter.get("/oauth/start", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const clientId = (await getSetting("GOOGLE_CLIENT_ID")).trim();
  if (!clientId) throw badRequest("Google Client ID is not configured.");

  const state = crypto.randomBytes(24).toString("base64url");
  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const redirectUri = new URL("/api/google/oauth/callback", req.protocol + "://" + req.get("host")).toString();

  await prisma.oAuthSession.create({
    data: {
      stateHash: state,
      codeVerifier,
      provider: "GOOGLE",
      userId,
      returnTo: redirectUri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  res.json({ authorizeUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}));

googleRouter.get("/oauth/callback", asyncHandler(async (req, res) => {
  const schema = z.object({ code: z.string().min(1), state: z.string().min(1), error: z.string().optional() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) throw badRequest("Invalid OAuth callback parameters.");
  if (parsed.data.error) throw badRequest(`Google OAuth error: ${parsed.data.error}`);

  const session = await prisma.oAuthSession.findFirst({
    where: { stateHash: parsed.data.state, provider: "GOOGLE", expiresAt: { gt: new Date() } },
  });
  if (!session) throw badRequest("Invalid or expired OAuth session.");

  const clientId = (await getSetting("GOOGLE_CLIENT_ID")).trim();
  const clientSecret = (await getSetting("GOOGLE_CLIENT_SECRET")).trim();
  const redirectUri = session.returnTo;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: parsed.data.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: session.codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw badRequest(`Token exchange failed: ${text}`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  };

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw badRequest("Failed to fetch Google profile.");
  const profile = await profileRes.json() as { email: string; name?: string; picture?: string };

  await prisma.integrationConnection.upsert({
    where: { userId_provider: { userId: session.userId, provider: "GOOGLE" } },
    update: {
      accountEmail: profile.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || session.codeVerifier,
      scopes: tokens.scope?.split(" ") ?? [],
      status: "ACTIVE",
      lastError: null,
    },
    create: {
      userId: session.userId,
      provider: "GOOGLE",
      accountEmail: profile.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
      scopes: tokens.scope?.split(" ") ?? [],
      status: "ACTIVE",
    },
  });

  await prisma.oAuthSession.delete({ where: { id: session.id } });
  res.redirect("/settings?google_connected=1");
}));

googleRouter.post("/send", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const schema = z.object({ to: z.string().email(), subject: z.string().min(1), body: z.string().min(1), threadId: z.string().optional() });
  const payload = schema.parse(req.body);

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw notFound("Google connection not found or expired. Please reconnect.");

  const message = [
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    payload.body,
  ].join("\r\n");

  const base64 = Buffer.from(message).toString("base64url");

  const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw: base64, threadId: payload.threadId }),
  });

  if (!gmailRes.ok) {
    const text = await gmailRes.text();
    throw badRequest(`Gmail send failed: ${text}`);
  }

  const sent = await gmailRes.json();
  res.json({ id: sent.id, threadId: sent.threadId });
}));

googleRouter.post("/disconnect", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  await prisma.integrationConnection.updateMany({
    where: { userId, provider: "GOOGLE" },
    data: { status: "DISCONNECTED", accessToken: null, refreshToken: null },
  });
  res.json({ ok: true });
}));
