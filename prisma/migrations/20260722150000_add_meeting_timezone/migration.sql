ALTER TABLE "meeting_slots"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn';

ALTER TABLE "meetings"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Tallinn';
