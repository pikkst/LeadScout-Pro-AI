-- DropIndex
DROP INDEX IF EXISTS "meetings_pitchId_idx";

-- DropIndex
DROP INDEX IF EXISTS "pitches_inReplyToId_idx";

-- AlterTable
ALTER TABLE "pitches" ADD COLUMN     "scheduledSendAt" TIMESTAMP(3);
