-- AddForeignKey
ALTER TABLE "pitch_events" ADD CONSTRAINT "pitch_events_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
