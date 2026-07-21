import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJson } from '../server/services/ai.service';

describe('extractJson', () => {
  it('parses valid JSON', () => {
    const result = extractJson('{"score": 50, "reason": "test"}', {});
    expect(result).toEqual({ score: 50, reason: 'test' });
  });

  it('extracts JSON from noisy text', () => {
    const text = 'Here is the result: {"score": 75, "reason": "good lead"} thanks!';
    const result = extractJson(text, {});
    expect(result).toEqual({ score: 75, reason: 'good lead' });
  });

  it('returns fallback for empty input', () => {
    const result = extractJson('', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('returns fallback for non-JSON', () => {
    const result = extractJson('no json here', { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('parses JSON arrays', () => {
    const result = extractJson('["a", "b", "c"]', []);
    expect(result).toEqual(['a', 'b', 'c']);
  });
});
