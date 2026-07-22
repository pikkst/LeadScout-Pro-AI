-- Allow administrator-defined pipeline stage keys while preserving built-in values.
ALTER TABLE "leads" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "stage" TYPE TEXT USING "stage"::TEXT;
ALTER TABLE "leads" ALTER COLUMN "stage" SET DEFAULT 'DISCOVERED';
DROP TYPE "LeadStage";

-- Claim pitch sends atomically before contacting the email provider.
ALTER TYPE "PitchStatus" ADD VALUE 'SENDING' BEFORE 'SENT';

-- Persist sequence trigger/claim state so concurrent workers cannot run one step twice.
ALTER TABLE "sequence_executions"
  ADD COLUMN "triggeredStep" INTEGER,
  ADD COLUMN "processingStep" INTEGER,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3);

CREATE INDEX "sequence_executions_status_nextRunAt_idx"
  ON "sequence_executions"("status", "nextRunAt");

-- Preserve the newest active run if legacy data contains duplicates, then enforce
-- the invariant used by the atomic sequence worker.
WITH ranked_active AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "leadId", "sequenceId"
    ORDER BY "startedAt" DESC, "id" DESC
  ) AS row_number
  FROM "sequence_executions"
  WHERE "status" = 'ACTIVE'
)
UPDATE "sequence_executions"
SET "status" = 'STOPPED', "completedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ranked_active WHERE row_number > 1);

CREATE UNIQUE INDEX "sequence_executions_one_active_per_lead_sequence"
  ON "sequence_executions"("leadId", "sequenceId")
  WHERE "status" = 'ACTIVE';

-- Replay protection for signed provider webhooks.
CREATE TABLE "webhook_receipts" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webhook_receipts_provider_providerEventId_key"
  ON "webhook_receipts"("provider", "providerEventId");
CREATE INDEX "webhook_receipts_receivedAt_idx" ON "webhook_receipts"("receivedAt");

-- Scheduler and booking hot paths.
CREATE INDEX "pitches_status_scheduledSendAt_idx" ON "pitches"("status", "scheduledSendAt");
CREATE INDEX "meeting_slots_agentId_date_isAvailable_isBooked_idx"
  ON "meeting_slots"("agentId", "date", "isAvailable", "isBooked");

-- Existing keys were stored in plaintext and cannot be converted without
-- retaining their secrets. Revoke them so administrators can issue hashed keys.
UPDATE "api_keys"
SET "isRevoked" = true
WHERE "key" !~ '^[0-9a-f]{64}$';
