import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the sequence engine logic extracted from server.ts
type SequenceStep = {
  id: string;
  order: number;
  delayDays: number;
  actionType: string;
  subject?: string;
  body?: string;
  taskName?: string;
  isActive: boolean;
  triggerEvent?: string;
  eventDelayDays?: number | null;
  stopOnEvent?: boolean;
};

type SequenceExecution = {
  id: string;
  leadId: string;
  sequenceId: string;
  status: string;
  currentStep: number;
  startedAt: Date;
  nextRunAt: Date;
  lastEventCheckedAt?: Date;
};

function calculateNextRun(exec: SequenceExecution, step: SequenceStep): Date {
  const now = new Date();
  const nextRun = new Date(now);

  if (step.triggerEvent) {
    // In real engine, we check pitch events here.
    // For unit test, we simulate the logic:
    if (step.stopOnEvent) {
      return new Date('9999-01-01'); // signal to complete
    }
    const delay = step.eventDelayDays ?? step.delayDays ?? 0;
    nextRun.setDate(nextRun.getDate() + delay);
    return nextRun;
  }

  const delay = step.delayDays ?? 0;
  nextRun.setDate(nextRun.getDate() + delay);
  return nextRun;
}

describe('SequenceEngine', () => {
  it('uses fixed delay when no trigger event', () => {
    const exec: SequenceExecution = {
      id: 'exec-1',
      leadId: 'lead-1',
      sequenceId: 'seq-1',
      status: 'ACTIVE',
      currentStep: 0,
      startedAt: new Date(),
      nextRunAt: new Date(),
    };
    const step: SequenceStep = {
      id: 'step-1',
      order: 0,
      delayDays: 5,
      actionType: 'TASK',
      taskName: 'Follow up',
      isActive: true,
    };

    const nextRun = calculateNextRun(exec, step);
    const expected = new Date();
    expected.setDate(expected.getDate() + 5);
    expect(nextRun.getDate()).toBe(expected.getDate());
  });

  it('uses eventDelayDays when trigger event is set', () => {
    const exec: SequenceExecution = {
      id: 'exec-1',
      leadId: 'lead-1',
      sequenceId: 'seq-1',
      status: 'ACTIVE',
      currentStep: 0,
      startedAt: new Date(),
      nextRunAt: new Date(),
    };
    const step: SequenceStep = {
      id: 'step-1',
      order: 0,
      delayDays: 7,
      actionType: 'TASK',
      taskName: 'Follow up',
      isActive: true,
      triggerEvent: 'OPENED',
      eventDelayDays: 2,
    };

    const nextRun = calculateNextRun(exec, step);
    const expected = new Date();
    expected.setDate(expected.getDate() + 2);
    expect(nextRun.getDate()).toBe(expected.getDate());
  });

  it('falls back to delayDays when eventDelayDays is null', () => {
    const exec: SequenceExecution = {
      id: 'exec-1',
      leadId: 'lead-1',
      sequenceId: 'seq-1',
      status: 'ACTIVE',
      currentStep: 0,
      startedAt: new Date(),
      nextRunAt: new Date(),
    };
    const step: SequenceStep = {
      id: 'step-1',
      order: 0,
      delayDays: 7,
      actionType: 'TASK',
      taskName: 'Follow up',
      isActive: true,
      triggerEvent: 'OPENED',
      eventDelayDays: null,
    };

    const nextRun = calculateNextRun(exec, step);
    const expected = new Date();
    expected.setDate(expected.getDate() + 7);
    expect(nextRun.getDate()).toBe(expected.getDate());
  });

  it('returns sentinel date when stopOnEvent is true', () => {
    const exec: SequenceExecution = {
      id: 'exec-1',
      leadId: 'lead-1',
      sequenceId: 'seq-1',
      status: 'ACTIVE',
      currentStep: 0,
      startedAt: new Date(),
      nextRunAt: new Date(),
    };
    const step: SequenceStep = {
      id: 'step-1',
      order: 0,
      delayDays: 7,
      actionType: 'TASK',
      taskName: 'Follow up',
      isActive: true,
      triggerEvent: 'REPLIED',
      stopOnEvent: true,
    };

    const nextRun = calculateNextRun(exec, step);
    expect(nextRun.getFullYear()).toBe(9999);
  });
});
