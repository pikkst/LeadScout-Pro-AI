import type { AuthUser } from "../middleware/auth";

export function canBookAgentSlot(user: AuthUser, slotAgentId: string): boolean {
  return user.id === slotAgentId || user.role === "ADMIN" || user.role === "MANAGER";
}
