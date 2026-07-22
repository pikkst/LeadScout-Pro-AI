import type { SequenceStopEvent } from "@prisma/client";
import { prisma } from "../db";

export async function stopSequencesForLead(leadId: string, event: SequenceStopEvent): Promise<number> {
  const executions = await prisma.sequenceExecution.findMany({
    where: { leadId, status: "ACTIVE", sequence: { stopEvents: { has: event } } },
    select: { id: true },
  });
  if (executions.length === 0) return 0;
  const result = await prisma.sequenceExecution.updateMany({
    where: { id: { in: executions.map((execution) => execution.id) }, status: "ACTIVE" },
    data: { status: "STOPPED", completedAt: new Date(), nextRunAt: null, processingStep: null, processingStartedAt: null, stoppedByEvent: event },
  });
  return result.count;
}
