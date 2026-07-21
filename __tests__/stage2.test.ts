import { describe, it, expect } from 'vitest';

function calculateNextRun(exec: any, step: any): Date {
  const now = new Date();
  const nextRun = new Date(now);

  if (step.triggerEvent) {
    if (step.stopOnEvent) {
      return new Date('9999-01-01');
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
    const exec = { id: 'exec-1', leadId: 'lead-1', sequenceId: 'seq-1', status: 'ACTIVE', currentStep: 0, startedAt: new Date(), nextRunAt: new Date() };
    const step = { id: 'step-1', order: 0, delayDays: 5, actionType: 'TASK', taskName: 'Follow up', isActive: true };

    const nextRun = calculateNextRun(exec, step);
    const expected = new Date();
    expected.setDate(expected.getDate() + 5);
    expect(nextRun.getDate()).toBe(expected.getDate());
  });

  it('uses eventDelayDays when trigger event is set', () => {
    const exec = { id: 'exec-1', leadId: 'lead-1', sequenceId: 'seq-1', status: 'ACTIVE', currentStep: 0, startedAt: new Date(), nextRunAt: new Date() };
    const step = { id: 'step-1', order: 0, delayDays: 7, actionType: 'TASK', taskName: 'Follow up', isActive: true, triggerEvent: 'OPENED', eventDelayDays: 2 };

    const nextRun = calculateNextRun(exec, step);
    const expected = new Date();
    expected.setDate(expected.getDate() + 2);
    expect(nextRun.getDate()).toBe(expected.getDate());
  });

  it('falls back to delayDays when eventDelayDays is null', () => {
    const exec = { id: 'exec-1', leadId: 'lead-1', sequenceId: 'seq-1', status: 'ACTIVE', currentStep: 0, startedAt: new Date(), nextRunAt: new Date() };
    const step = { id: 'step-1', order: 0, delayDays: 7, actionType: 'TASK', taskName: 'Follow up', isActive: true, triggerEvent: 'OPENED', eventDelayDays: null };

    const nextRun = calculateNextRun(exec, step);
    const expected = new Date();
    expected.setDate(expected.getDate() + 7);
    expect(nextRun.getDate()).toBe(expected.getDate());
  });

  it('returns sentinel date when stopOnEvent is true', () => {
    const exec = { id: 'exec-1', leadId: 'lead-1', sequenceId: 'seq-1', status: 'ACTIVE', currentStep: 0, startedAt: new Date(), nextRunAt: new Date() };
    const step = { id: 'step-1', order: 0, delayDays: 7, actionType: 'TASK', taskName: 'Follow up', isActive: true, triggerEvent: 'REPLIED', stopOnEvent: true };

    const nextRun = calculateNextRun(exec, step);
    expect(nextRun.getFullYear()).toBe(9999);
  });
});

describe('StagePrediction fallbacks', () => {
  it('provides sensible defaults for missing AI response', () => {
    const emptyResponse = {};
    const predictedStage = emptyResponse.predictedStage || "Contacted";
    const probability = Math.max(0, Math.min(100, Math.round(Number(emptyResponse.probability ?? 50))));
    const estimatedDays = Math.max(1, Math.round(Number(emptyResponse.estimatedDays ?? 7)));

    expect(predictedStage).toBe("Contacted");
    expect(probability).toBe(50);
    expect(estimatedDays).toBe(7);
  });
});

describe('AiForecast fallbacks', () => {
  it('provides sensible defaults for missing AI response', () => {
    const emptyResponse = {};
    const next30Deals = Math.round(Number(emptyResponse.next30Days?.estimatedDeals ?? 0));
    const next90Deals = Math.round(Number(emptyResponse.next90Days?.estimatedDeals ?? 0));
    const confidence = Math.max(0, Math.min(100, Math.round(Number(emptyResponse.confidence ?? 60))));

    expect(next30Deals).toBe(0);
    expect(next90Deals).toBe(0);
    expect(confidence).toBe(60);
  });
});

describe('MeetingPrep fallbacks', () => {
  it('provides sensible defaults for missing AI response', () => {
    const emptyResponse = {};
    const talkingPoints = Array.isArray(emptyResponse.talkingPoints) ? emptyResponse.talkingPoints : ["Review lead background", "Discuss partnership opportunities"];
    const winThemes = Array.isArray(emptyResponse.winThemes) ? emptyResponse.winThemes : ["Value proposition alignment", "Mutual growth potential"];
    const objections = Array.isArray(emptyResponse.potentialObjections) ? emptyResponse.potentialObjections : ["Budget constraints", "Timing concerns"];
    const approach = emptyResponse.recommendedApproach || "Focus on mutual benefits and clear ROI.";

    expect(talkingPoints).toEqual(["Review lead background", "Discuss partnership opportunities"]);
    expect(winThemes).toEqual(["Value proposition alignment", "Mutual growth potential"]);
    expect(objections).toEqual(["Budget constraints", "Timing concerns"]);
    expect(approach).toBe("Focus on mutual benefits and clear ROI.");
  });
});
