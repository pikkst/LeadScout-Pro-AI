-- DropIndex
DROP INDEX "meetings_pitchId_idx";

-- DropIndex
DROP INDEX "pitches_inReplyToId_idx";

-- AlterTable
ALTER TABLE "pitches" ADD COLUMN     "scheduledSendAt" TIMESTAMP(3);
