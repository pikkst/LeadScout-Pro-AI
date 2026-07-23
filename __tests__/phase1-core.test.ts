import { describe, expect, it } from 'vitest';
import {
  classifyRelationshipMessage,
  hasBusyConflict,
  mergeBusyIntervals,
  selectRoundRobinMember,
  shouldStopSequenceForEvent,
} from '../server/utils/relationship';

describe('Phase 1 relationship intelligence', () => {
  it('classifies positive meeting intent and negative objections with deterministic fallbacks', () => {
    expect(classifyRelationshipMessage('Re: proposal', 'Yes, please book a demo next week.')).toMatchObject({
      intent: 'MEETING_REQUEST',
      sentiment: 'POSITIVE',
    });
    expect(classifyRelationshipMessage('Re: proposal', 'Not interested. Please remove me.')).toMatchObject({
      intent: 'UNSUBSCRIBE',
      sentiment: 'NEGATIVE',
    });
  });

  it('merges provider busy windows and detects overlaps', () => {
    const merged = mergeBusyIntervals([
      { start: '2026-08-01T08:00:00.000Z', end: '2026-08-01T09:00:00.000Z' },
      { start: '2026-08-01T08:30:00.000Z', end: '2026-08-01T10:00:00.000Z' },
      { start: '2026-08-01T12:00:00.000Z', end: '2026-08-01T13:00:00.000Z' },
    ]);
    expect(merged).toEqual([
      { start: '2026-08-01T08:00:00.000Z', end: '2026-08-01T10:00:00.000Z' },
      { start: '2026-08-01T12:00:00.000Z', end: '2026-08-01T13:00:00.000Z' },
    ]);
    expect(hasBusyConflict('2026-08-01T09:30:00.000Z', '2026-08-01T10:30:00.000Z', merged)).toBe(true);
    expect(hasBusyConflict('2026-08-01T10:00:00.000Z', '2026-08-01T11:00:00.000Z', merged)).toBe(false);
  });

  it('selects the least recently assigned active round-robin member', () => {
    const selected = selectRoundRobinMember([
      { userId: 'disabled', isActive: false, lastAssignedAt: null, priority: 1 },
      { userId: 'recent', isActive: true, lastAssignedAt: new Date('2026-07-22T10:00:00Z'), priority: 1 },
      { userId: 'never', isActive: true, lastAssignedAt: null, priority: 1 },
    ]);
    expect(selected?.userId).toBe('never');
  });

  it.each(['REPLY', 'UNSUBSCRIBE', 'BOUNCE', 'MEETING', 'SUCCESS'] as const)(
    'stops a sequence for configured %s events',
    (event) => expect(shouldStopSequenceForEvent(event, [event])).toBe(true),
  );
});
