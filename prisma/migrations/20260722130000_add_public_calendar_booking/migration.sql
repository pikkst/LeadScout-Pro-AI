-- Remove duplicate concrete slots before enforcing one slot per agent/time.
WITH ranked_slots AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "agentId", "date", "startTime"
      ORDER BY "isBooked" DESC, "meetingId" NULLS LAST, "id"
    ) AS row_number
  FROM "meeting_slots"
)
DELETE FROM "meeting_slots"
WHERE "id" IN (SELECT "id" FROM ranked_slots WHERE row_number > 1);

CREATE UNIQUE INDEX "meeting_slots_agentId_date_startTime_key"
ON "meeting_slots"("agentId", "date", "startTime");

CREATE TABLE "availability_rules" (
  "id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "slotDuration" INTEGER NOT NULL DEFAULT 30,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "agentId" TEXT NOT NULL,
  CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "availability_rules_agentId_weekday_key"
ON "availability_rules"("agentId", "weekday");
CREATE INDEX "availability_rules_agentId_isActive_idx"
ON "availability_rules"("agentId", "isActive");
ALTER TABLE "availability_rules"
ADD CONSTRAINT "availability_rules_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "booking_links" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "pitchId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  CONSTRAINT "booking_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_links_token_key" ON "booking_links"("token");
CREATE UNIQUE INDEX "booking_links_pitchId_key" ON "booking_links"("pitchId");
CREATE INDEX "booking_links_agentId_idx" ON "booking_links"("agentId");
CREATE INDEX "booking_links_leadId_idx" ON "booking_links"("leadId");
CREATE INDEX "booking_links_expiresAt_idx" ON "booking_links"("expiresAt");
ALTER TABLE "booking_links"
ADD CONSTRAINT "booking_links_pitchId_fkey"
FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_links"
ADD CONSTRAINT "booking_links_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_links"
ADD CONSTRAINT "booking_links_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
