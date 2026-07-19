// Best-effort activity logging for the shared team audit trail.
import { prisma } from "../db";

export async function logActivity(params: {
  action: string;
  detail?: string;
  userId?: string | null;
  leadId?: string | null;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: params.action,
        detail: params.detail ?? "",
        userId: params.userId ?? null,
        leadId: params.leadId ?? null,
      },
    });
  } catch (err) {
    // Logging must never break the request path.
    console.warn("[activity] Failed to record activity:", (err as Error).message);
  }
}
