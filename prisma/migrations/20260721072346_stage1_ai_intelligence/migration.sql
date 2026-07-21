-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "aiScore" INTEGER,
ADD COLUMN     "aiScoreReason" TEXT,
ADD COLUMN     "enrichmentData" TEXT;

-- AlterTable
ALTER TABLE "sequence_executions" ADD COLUMN     "lastEventCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sequence_steps" ADD COLUMN     "eventDelayDays" INTEGER,
ADD COLUMN     "stopOnEvent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "triggerEvent" "PitchEventType";
