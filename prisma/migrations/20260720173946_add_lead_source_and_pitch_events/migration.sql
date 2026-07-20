-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('AI_SCOUT', 'MANUAL', 'CSV_IMPORT', 'PITCH_REPLY', 'OTHER');

-- CreateEnum
CREATE TYPE "PitchEventType" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'FAILED');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "source" "LeadSource" NOT NULL DEFAULT 'AI_SCOUT';

-- CreateTable
CREATE TABLE "pitch_events" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "type" "PitchEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pitch_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pitch_events_pitchId_idx" ON "pitch_events"("pitchId");
