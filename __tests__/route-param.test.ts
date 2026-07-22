import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { param } from '../server/utils/param';

describe('route parameter validation', () => {
  it('returns a non-empty string parameter', () => {
    expect(param({ params: { id: 'lead-123' } } as unknown as Request, 'id')).toBe('lead-123');
  });

  it.each([undefined, '', ['lead-123', 'tampered']])('rejects ambiguous or missing input: %j', (value) => {
    const request = { params: { id: value } } as unknown as Request;
    expect(() => param(request, 'id')).toThrow('Invalid id route parameter.');
  });
});
