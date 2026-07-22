import { prisma } from "../db";
import { getSetting } from "./settings.service";
import { getValidAccessToken, getConnectionForUser } from "./google.service";

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  labels: string[];
  internalDate: number;
}

export async function listMessages(accessToken: string, historyId?: string): Promise<GmailMessage[]> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("max", "50");
  if (historyId) url.searchParams.set("historyId", String(historyId));

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail list failed: ${text}`);
  }

  const data = (await res.json()) as { messages?: Array<{ id: string; threadId: string }> };
  if (!data.messages?.length) return [];

  const messages = await Promise.all(
    data.messages.map((m) => fetchMessage(accessToken, m.id, m.threadId))
  );

  return messages.filter((m): m is GmailMessage => Boolean(m));
}

async function fetchMessage(accessToken: string, id: string, threadId: string): Promise<GmailMessage | null> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const msg = (await res.json()) as {
    id: string;
    threadId: string;
    labelIds: string[];
    internalDate: number;
    payload: {
      headers: Array<{ name: string; value: string }>;
      body: { data?: string; size?: number };
    };
  };

  const headers: Record<string, string> = {};
  for (const h of msg.payload.headers) {
    headers[h.name.toLowerCase()] = h.value;
  }

  let body = "";
  if (msg.payload.body.data) {
    body = Buffer.from(msg.payload.body.data, "base64url").toString("utf-8");
  } else if ((msg.payload as any).parts) {
    const textPart = (msg.payload as any).parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    }
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headers.from || "",
    to: headers.to || "",
    subject: headers.subject || "(no subject)",
    snippet: (msg as any).snippet || "",
    body,
    labels: msg.labelIds ?? [],
    internalDate: msg.internalDate,
  };
}

export async function syncConversationsForUser(userId: string, limit = 50): Promise<{ synced: number }> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "GOOGLE" },
  });
  if (!connection || connection.status !== "ACTIVE" || !connection.accessToken) {
    return { synced: 0 };
  }

  const historyId = connection.mailCursor;
  let accessToken = connection.accessToken;

  if (connection.expiresAt && connection.expiresAt <= new Date() && connection.refreshToken) {
    try {
      accessToken = await refreshAccessToken(connection.id, connection.refreshToken);
    } catch {
      return { synced: 0 };
    }
  }

  const messages = await listMessages(accessToken, historyId);
  let synced = 0;

  for (const message of messages) {
  const existing = await prisma.conversation.findFirst({
    where: { externalThreadId: message.threadId, connectionId: connection.id },
  });

  const conversation = await prisma.conversation.upsert({
    where: { id: existing?.id ?? "" },
    create: {
      externalThreadId: message.threadId,
      subject: message.subject,
      participants: { from: message.from, to: message.to },
      status: "OPEN",
      unreadCount: message.labels.includes("UNREAD") ? 1 : 0,
      lastMessageAt: new Date(message.internalDate),
      connectionId: connection.id,
      ownerId: userId,
      messages: {
        create: {
          externalMessageId: message.id,
          direction: "INBOUND",
          senderEmail: message.from,
          recipientEmails: [message.to],
          subject: message.subject,
          textBody: message.body || message.snippet,
          occurredAt: new Date(message.internalDate),
          isRead: !message.labels.includes("UNREAD"),
        },
      },
    },
    update: {
      lastMessageAt: new Date(message.internalDate),
      unreadCount: { increment: message.labels.includes("UNREAD") ? 1 : 0 },
      messages: {
        create: {
          externalMessageId: message.id,
          direction: "INBOUND",
          senderEmail: message.from,
          recipientEmails: [message.to],
          subject: message.subject,
          textBody: message.body || message.snippet,
          occurredAt: new Date(message.internalDate),
          isRead: !message.labels.includes("UNREAD"),
        },
      },
    },
  });

    synced += 1;
  }

  if (messages.length > 0) {
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { mailCursor: messages[0].id, lastMailSyncAt: new Date() },
    });
  }

  return { synced };
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
