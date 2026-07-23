CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST');
CREATE TYPE "RelationshipType" AS ENUM ('PROSPECT', 'CUSTOMER', 'PARTNER', 'RECRUITING', 'CHANNEL', 'OTHER');
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE', 'MICROSOFT');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'NEEDS_REAUTH', 'DISCONNECTED', 'ERROR');
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'WAITING', 'SNOOZED', 'DONE');
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "RelationshipSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
CREATE TYPE "RelationshipIntent" AS ENUM ('INTERESTED', 'MEETING_REQUEST', 'QUESTION', 'OBJECTION', 'UNSUBSCRIBE', 'OTHER');
CREATE TYPE "TimelineEntryType" AS ENUM ('EMAIL', 'REPLY', 'MEETING', 'TASK', 'NOTE', 'DOCUMENT', 'STAGE_CHANGE', 'OPPORTUNITY', 'UNSUBSCRIBE', 'BOUNCE');
CREATE TYPE "ExternalCalendarEventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');
CREATE TYPE "SequenceStopEvent" AS ENUM ('REPLY', 'UNSUBSCRIBE', 'BOUNCE', 'MEETING', 'SUCCESS');

CREATE TABLE "accounts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT,
  "website" TEXT,
  "industry" TEXT,
  "description" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "accounts_domain_key" ON "accounts"("domain");
CREATE INDEX "accounts_ownerId_idx" ON "accounts"("ownerId");
CREATE INDEX "accounts_updatedAt_idx" ON "accounts"("updatedAt");
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads" ADD COLUMN "accountId" TEXT;
ALTER TABLE "leads" ADD CONSTRAINT "leads_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "leads_accountId_idx" ON "leads"("accountId");

INSERT INTO "accounts" ("id", "name", "domain", "website", "industry", "description", "ownerId", "createdAt", "updatedAt")
SELECT DISTINCT ON (COALESCE(NULLIF(lower("domain"), ''), "id"))
  'acct_' || md5(COALESCE(NULLIF(lower("domain"), ''), "id")),
  "name",
  NULLIF(lower("domain"), ''),
  NULLIF("website", ''),
  NULLIF("category", ''),
  "description",
  COALESCE("assignedAgentId", "createdById"),
  "createdAt",
  "updatedAt"
FROM "leads"
ORDER BY COALESCE(NULLIF(lower("domain"), ''), "id"), "updatedAt" DESC;

UPDATE "leads"
SET "accountId" = 'acct_' || md5(COALESCE(NULLIF(lower("domain"), ''), "id"));

CREATE TABLE "contacts" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "title" TEXT,
  "consentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "consentSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountId" TEXT NOT NULL,
  "ownerId" TEXT,
  "legacyLeadId" TEXT,
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contacts_legacyLeadId_key" ON "contacts"("legacyLeadId");
CREATE INDEX "contacts_accountId_email_idx" ON "contacts"("accountId", "email");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "contacts_ownerId_idx" ON "contacts"("ownerId");
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "contacts" ("id", "fullName", "email", "phone", "accountId", "ownerId", "legacyLeadId", "createdAt", "updatedAt")
SELECT 'contact_' || "id", "name", lower("email"), "phone", "accountId", COALESCE("assignedAgentId", "createdById"), "id", "createdAt", "updatedAt"
FROM "leads" WHERE "accountId" IS NOT NULL;

CREATE TABLE "opportunities" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stage" TEXT NOT NULL DEFAULT 'DISCOVERY',
  "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
  "value" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "probability" INTEGER NOT NULL DEFAULT 10,
  "expectedCloseAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountId" TEXT NOT NULL,
  "primaryContactId" TEXT,
  "legacyLeadId" TEXT,
  "ownerId" TEXT,
  CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "opportunities_accountId_status_idx" ON "opportunities"("accountId", "status");
CREATE INDEX "opportunities_ownerId_updatedAt_idx" ON "opportunities"("ownerId", "updatedAt");
CREATE INDEX "opportunities_legacyLeadId_idx" ON "opportunities"("legacyLeadId");
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "opportunities" ("id", "name", "stage", "value", "probability", "accountId", "primaryContactId", "legacyLeadId", "ownerId", "createdAt", "updatedAt")
SELECT 'opp_' || l."id", l."name" || ' opportunity', l."stage", l."estimatedValue",
  COALESCE(l."aiScore", 10), l."accountId", c."id", l."id", COALESCE(l."assignedAgentId", l."createdById"), l."createdAt", l."updatedAt"
FROM "leads" l LEFT JOIN "contacts" c ON c."legacyLeadId" = l."id"
WHERE l."accountId" IS NOT NULL AND l."estimatedValue" > 0;

CREATE TABLE "relationships" (
  "id" TEXT NOT NULL,
  "type" "RelationshipType" NOT NULL DEFAULT 'PROSPECT',
  "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
  "strength" INTEGER NOT NULL DEFAULT 0,
  "lastInteractionAt" TIMESTAMP(3),
  "nextActionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountId" TEXT NOT NULL,
  "contactId" TEXT,
  "opportunityId" TEXT,
  "legacyLeadId" TEXT,
  "ownerId" TEXT,
  CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "relationships_accountId_status_idx" ON "relationships"("accountId", "status");
CREATE INDEX "relationships_contactId_idx" ON "relationships"("contactId");
CREATE INDEX "relationships_ownerId_nextActionAt_idx" ON "relationships"("ownerId", "nextActionAt");
CREATE INDEX "relationships_legacyLeadId_idx" ON "relationships"("legacyLeadId");
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "relationships" ("id", "accountId", "contactId", "opportunityId", "legacyLeadId", "ownerId", "lastInteractionAt", "nextActionAt", "createdAt", "updatedAt")
SELECT 'rel_' || l."id", l."accountId", c."id", o."id", l."id", COALESCE(l."assignedAgentId", l."createdById"), l."lastContactedAt", f."dueDate", l."createdAt", l."updatedAt"
FROM "leads" l
LEFT JOIN "contacts" c ON c."legacyLeadId" = l."id"
LEFT JOIN "opportunities" o ON o."legacyLeadId" = l."id"
LEFT JOIN "follow_up_tasks" f ON f."leadId" = l."id"
WHERE l."accountId" IS NOT NULL;

CREATE TABLE "integration_connections" (
  "id" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
  "accountEmail" TEXT,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "mailCursor" TEXT,
  "calendarCursor" TEXT,
  "lastMailSyncAt" TIMESTAMP(3),
  "lastCalendarSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "integration_connections_userId_provider_key" ON "integration_connections"("userId", "provider");
CREATE INDEX "integration_connections_provider_status_idx" ON "integration_connections"("provider", "status");
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "oauth_sessions" (
  "id" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "codeVerifier" TEXT NOT NULL,
  "returnTo" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  CONSTRAINT "oauth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "oauth_sessions_stateHash_key" ON "oauth_sessions"("stateHash");
CREATE INDEX "oauth_sessions_userId_provider_idx" ON "oauth_sessions"("userId", "provider");
CREATE INDEX "oauth_sessions_expiresAt_idx" ON "oauth_sessions"("expiresAt");

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "externalThreadId" TEXT NOT NULL,
  "subject" TEXT NOT NULL DEFAULT '',
  "participants" JSONB,
  "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT,
  "sentiment" "RelationshipSentiment" NOT NULL DEFAULT 'NEUTRAL',
  "intent" "RelationshipIntent" NOT NULL DEFAULT 'OTHER',
  "suggestedReply" TEXT,
  "slaDueAt" TIMESTAMP(3),
  "snoozedUntil" TIMESTAMP(3),
  "lastMessageAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT,
  "contactId" TEXT,
  "legacyLeadId" TEXT,
  "ownerId" TEXT,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversations_connectionId_externalThreadId_key" ON "conversations"("connectionId", "externalThreadId");
CREATE INDEX "conversations_ownerId_status_lastMessageAt_idx" ON "conversations"("ownerId", "status", "lastMessageAt");
CREATE INDEX "conversations_contactId_idx" ON "conversations"("contactId");
CREATE INDEX "conversations_legacyLeadId_idx" ON "conversations"("legacyLeadId");
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "conversation_messages" (
  "id" TEXT NOT NULL,
  "externalMessageId" TEXT NOT NULL,
  "internetMessageId" TEXT,
  "direction" "MessageDirection" NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "recipientEmails" JSONB NOT NULL,
  "ccEmails" JSONB,
  "subject" TEXT NOT NULL DEFAULT '',
  "textBody" TEXT NOT NULL DEFAULT '',
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "intent" "RelationshipIntent" NOT NULL DEFAULT 'OTHER',
  "sentiment" "RelationshipSentiment" NOT NULL DEFAULT 'NEUTRAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conversationId" TEXT NOT NULL,
  CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversation_messages_conversationId_externalMessageId_key" ON "conversation_messages"("conversationId", "externalMessageId");
CREATE INDEX "conversation_messages_internetMessageId_idx" ON "conversation_messages"("internetMessageId");
CREATE INDEX "conversation_messages_occurredAt_idx" ON "conversation_messages"("occurredAt");
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "timeline_entries" (
  "id" TEXT NOT NULL,
  "type" "TimelineEntryType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "metadata" JSONB,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "dedupeKey" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountId" TEXT,
  "contactId" TEXT,
  "opportunityId" TEXT,
  "relationshipId" TEXT,
  "legacyLeadId" TEXT,
  "conversationId" TEXT,
  "messageId" TEXT,
  "actorId" TEXT,
  CONSTRAINT "timeline_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "timeline_entries_dedupeKey_key" ON "timeline_entries"("dedupeKey");
CREATE UNIQUE INDEX "timeline_entries_messageId_key" ON "timeline_entries"("messageId");
CREATE INDEX "timeline_entries_accountId_occurredAt_idx" ON "timeline_entries"("accountId", "occurredAt");
CREATE INDEX "timeline_entries_legacyLeadId_occurredAt_idx" ON "timeline_entries"("legacyLeadId", "occurredAt");
CREATE INDEX "timeline_entries_contactId_occurredAt_idx" ON "timeline_entries"("contactId", "occurredAt");
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "external_calendar_events" (
  "id" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "status" "ExternalCalendarEventStatus" NOT NULL DEFAULT 'CONFIRMED',
  "isBusy" BOOLEAN NOT NULL DEFAULT true,
  "organizerEmail" TEXT,
  "attendeeEmails" JSONB,
  "etag" TEXT,
  "reminderMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT,
  "contactId" TEXT,
  "legacyLeadId" TEXT,
  "meetingId" TEXT,
  CONSTRAINT "external_calendar_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "external_calendar_events_meetingId_key" ON "external_calendar_events"("meetingId");
CREATE UNIQUE INDEX "external_calendar_events_connectionId_externalEventId_key" ON "external_calendar_events"("connectionId", "externalEventId");
CREATE INDEX "external_calendar_events_connectionId_startAt_endAt_idx" ON "external_calendar_events"("connectionId", "startAt", "endAt");
CREATE INDEX "external_calendar_events_legacyLeadId_idx" ON "external_calendar_events"("legacyLeadId");
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_legacyLeadId_fkey" FOREIGN KEY ("legacyLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "team_booking_pages" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "duration" INTEGER NOT NULL DEFAULT 30,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_booking_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_booking_pages_slug_key" ON "team_booking_pages"("slug");
CREATE INDEX "team_booking_pages_isActive_idx" ON "team_booking_pages"("isActive");

CREATE TABLE "team_booking_members" (
  "id" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastAssignedAt" TIMESTAMP(3),
  "pageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "team_booking_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_booking_members_pageId_userId_key" ON "team_booking_members"("pageId", "userId");
CREATE INDEX "team_booking_members_pageId_isActive_priority_idx" ON "team_booking_members"("pageId", "isActive", "priority");
ALTER TABLE "team_booking_members" ADD CONSTRAINT "team_booking_members_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "team_booking_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_booking_members" ADD CONSTRAINT "team_booking_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follow_up_sequences" ADD COLUMN "stopEvents" "SequenceStopEvent"[] NOT NULL DEFAULT ARRAY['REPLY', 'UNSUBSCRIBE', 'BOUNCE', 'MEETING']::"SequenceStopEvent"[];
ALTER TABLE "sequence_executions" ADD COLUMN "stoppedByEvent" "SequenceStopEvent";
