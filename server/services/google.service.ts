import { prisma } from "../db";
import { getSetting } from "../services/settings.service";

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export async function getConnectionForUser(userId: string): Promise<
  { id: string; accountEmail: string | null; accessToken: string | null; refreshToken: string | null; scopes: string[] } | null
> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "GOOGLE" },
    select: { id: true, accountEmail: true, accessToken: true, refreshToken: true, scopes: true },
  });
  return connection;
}

async function refreshAccessToken(connectionId: string, refreshToken: string): Promise<string> {
  const clientId = (await getSetting("GOOGLE_CLIENT_ID")).trim();
  const clientSecret = (await getSetting("GOOGLE_CLIENT_SECRET")).trim();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  const tokens = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: { accessToken: tokens.access_token, expiresAt },
  });

  return tokens.access_token;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "GOOGLE" },
  });
  if (!connection || connection.status !== "ACTIVE" || !connection.accessToken) return null;

  if (connection.expiresAt && connection.expiresAt <= new Date() && connection.refreshToken) {
    try {
      const newToken = await refreshAccessToken(connection.id, connection.refreshToken);
      return newToken;
    } catch {
      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: { status: "NEEDS_REAUTH" },
      });
      return null;
    }
  }

  return connection.accessToken;
}
