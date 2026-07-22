-- Phase 0 activation funnel, unsubscribe, and deliverability enforcement.
ALTER TYPE "PitchEventType" ADD VALUE 'COMPLAINED' AFTER 'BOUNCED';

CREATE TABLE "email_suppressions" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_suppressions_email_key" ON "email_suppressions"("email");
CREATE INDEX "email_suppressions_createdAt_idx" ON "email_suppressions"("createdAt");

CREATE TABLE "unsubscribe_links" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pitchId" TEXT NOT NULL,
  CONSTRAINT "unsubscribe_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unsubscribe_links_token_key" ON "unsubscribe_links"("token");
CREATE UNIQUE INDEX "unsubscribe_links_pitchId_key" ON "unsubscribe_links"("pitchId");
CREATE INDEX "unsubscribe_links_email_idx" ON "unsubscribe_links"("email");
ALTER TABLE "unsubscribe_links" ADD CONSTRAINT "unsubscribe_links_pitchId_fkey"
  FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "activation_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "userId" TEXT,
  "leadId" TEXT,
  "pitchId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activation_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activation_events_type_createdAt_idx" ON "activation_events"("type", "createdAt");
CREATE INDEX "activation_events_userId_createdAt_idx" ON "activation_events"("userId", "createdAt");
CREATE INDEX "activation_events_leadId_idx" ON "activation_events"("leadId");
CREATE INDEX "activation_events_pitchId_idx" ON "activation_events"("pitchId");
