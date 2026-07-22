-- Track whether user-facing activity notifications have been read.
ALTER TABLE "activity_logs" ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "activity_logs_userId_readAt_idx" ON "activity_logs"("userId", "readAt");
