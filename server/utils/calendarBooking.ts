import type { AuthUser } from "../middleware/auth";

export function canBookAgentSlot(user: AuthUser, slotAgentId: string): boolean {
  return user.id === slotAgentId || user.role === "ADMIN" || user.role === "MANAGER";
}

export function canCancelMeeting(
  user: AuthUser,
  meeting: { agentId: string | null; slots?: Array<{ agentId: string }> },
): boolean {
  if (user.role === "ADMIN" || user.role === "MANAGER") return true;
  const ownerId = meeting.agentId ?? meeting.slots?.[0]?.agentId ?? null;
  return ownerId === user.id;
}
