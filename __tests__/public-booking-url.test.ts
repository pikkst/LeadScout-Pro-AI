import { describe, expect, it } from 'vitest';
import { normalizePublicBookingBaseUrl } from '../server/services/settings.service';

describe('public booking URL validation', () => {
  it('normalizes a public HTTPS origin', () => {
    expect(normalizePublicBookingBaseUrl('https://book.example.com/')).toBe('https://book.example.com');
  });

  it('allows HTTP only for local development', () => {
    expect(normalizePublicBookingBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(() => normalizePublicBookingBaseUrl('http://book.example.com')).toThrow('Use HTTPS');
  });

  it.each([
    'https://user:pass@book.example.com',
    'https://book.example.com/path',
    'https://book.example.com?source=test',
  ])('rejects an unsafe or misleading origin: %s', (url) => {
    expect(() => normalizePublicBookingBaseUrl(url)).toThrow();
  });
});
