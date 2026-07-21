-- AlterTable
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "pitchId" TEXT,
ADD COLUMN IF NOT EXISTS "agentId" TEXT;

-- AlterTable
ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "sentFromEmail" TEXT,
ADD COLUMN IF NOT EXISTS "sentFromName" TEXT,
ADD COLUMN IF NOT EXISTS "replyToEmail" TEXT,
ADD COLUMN IF NOT EXISTS "sentMessageId" TEXT,
ADD COLUMN IF NOT EXISTS "inReplyToId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "meetings_pitchId_idx" ON "meetings"("pitchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "meetings_agentId_idx" ON "meetings"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pitches_inReplyToId_key" ON "pitches"("inReplyToId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pitches_inReplyToId_idx" ON "pitches"("inReplyToId");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_inReplyToId_fkey" FOREIGN KEY ("inReplyToId") REFERENCES "pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
