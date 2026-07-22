ALTER TABLE "booking_links"
ADD COLUMN "bookedAt" TIMESTAMP(3),
ADD COLUMN "meetingId" TEXT;

CREATE UNIQUE INDEX "booking_links_meetingId_key" ON "booking_links"("meetingId");
ALTER TABLE "booking_links"
ADD CONSTRAINT "booking_links_meetingId_fkey"
FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
