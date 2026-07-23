export type RelationshipIntent = "INTERESTED" | "MEETING_REQUEST" | "QUESTION" | "OBJECTION" | "UNSUBSCRIBE" | "OTHER";
export type RelationshipSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type SequenceStopEventName = "REPLY" | "UNSUBSCRIBE" | "BOUNCE" | "MEETING" | "SUCCESS";

export interface BusyInterval {
  start: string;
  end: string;
}

export function classifyRelationshipMessage(subject: string, body: string): {
  intent: RelationshipIntent;
  sentiment: RelationshipSentiment;
  summary: string;
} {
  const content = `${subject}\n${body}`.trim();
  const normalized = content.toLowerCase();
  const unsubscribe = /\b(unsubscribe|remove me|do not contact|stop emailing|opt out)\b/.test(normalized);
  const meeting = /\b(book|schedule|calendar|meeting|demo|call|next week|availability)\b/.test(normalized);
  const objection = /\b(not interested|no budget|too expensive|wrong person|not a fit|decline)\b/.test(normalized);
  const interested = /\b(interested|sounds good|yes|let'?s talk|tell me more|great)\b/.test(normalized);
  const question = /\?|\b(how|what|when|where|who|can you|could you)\b/.test(normalized);
  const negative = unsubscribe || objection || /\b(no|never|bad|unhappy|disappointed)\b/.test(normalized);
  const positive = !negative && (interested || meeting || /\b(thanks|thank you|appreciate)\b/.test(normalized));
  const intent: RelationshipIntent = unsubscribe
    ? "UNSUBSCRIBE"
    : meeting
      ? "MEETING_REQUEST"
      : objection
        ? "OBJECTION"
        : interested
          ? "INTERESTED"
          : question
            ? "QUESTION"
            : "OTHER";
  const sentiment: RelationshipSentiment = negative ? "NEGATIVE" : positive ? "POSITIVE" : "NEUTRAL";
  const compact = content.replace(/\s+/g, " ").trim();
  return { intent, sentiment, summary: compact.length > 180 ? `${compact.slice(0, 177)}...` : compact };
}

export function mergeBusyIntervals(intervals: BusyInterval[]): BusyInterval[] {
  const sorted = intervals
    .filter((interval) => Date.parse(interval.start) < Date.parse(interval.end))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const merged: BusyInterval[] = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || Date.parse(interval.start) > Date.parse(previous.end)) {
      merged.push({ ...interval });
      continue;
    }
    if (Date.parse(interval.end) > Date.parse(previous.end)) previous.end = interval.end;
  }
  return merged;
}

export function hasBusyConflict(start: string, end: string, intervals: BusyInterval[]): boolean {
  const startAt = Date.parse(start);
  const endAt = Date.parse(end);
  return intervals.some((interval) => startAt < Date.parse(interval.end) && endAt > Date.parse(interval.start));
}

export function selectRoundRobinMember<T extends {
  userId: string;
  isActive: boolean;
  lastAssignedAt: Date | null;
  priority: number;
}>(members: T[]): T | null {
  return [...members]
    .filter((member) => member.isActive)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const aAssigned = a.lastAssignedAt?.getTime() ?? 0;
      const bAssigned = b.lastAssignedAt?.getTime() ?? 0;
      return aAssigned - bAssigned || a.userId.localeCompare(b.userId);
    })[0] ?? null;
}

export function shouldStopSequenceForEvent(event: SequenceStopEventName, configuredEvents: readonly string[]): boolean {
  return configuredEvents.includes(event);
}
