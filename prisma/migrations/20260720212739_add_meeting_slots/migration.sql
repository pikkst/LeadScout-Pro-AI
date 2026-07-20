-- CreateTable
CREATE TABLE "meeting_slots" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "agentId" TEXT NOT NULL,
    "meetingId" TEXT,

    CONSTRAINT "meeting_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_slots_agentId_idx" ON "meeting_slots"("agentId");

-- CreateIndex
CREATE INDEX "meeting_slots_date_idx" ON "meeting_slots"("date");

-- AddForeignKey
ALTER TABLE "meeting_slots" ADD CONSTRAINT "meeting_slots_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_slots" ADD CONSTRAINT "meeting_slots_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
