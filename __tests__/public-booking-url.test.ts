import { describe, expect, it } from 'vitest';
import { normalizePublicBookingBaseUrl, resolvePublicBookingBaseUrl } from '../server/services/settings.service';

describe('public booking URL validation', () => {
  it('normalizes a public HTTPS origin', () => {
    expect(normalizePublicBookingBaseUrl('https://book.example.com/')).toBe('https://book.example.com');
  });

  it('allows HTTP only for local development', () => {
    expect(normalizePublicBookingBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizePublicBookingBaseUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(normalizePublicBookingBaseUrl('http://[::1]')).toBe('http://[::1]');
    expect(() => normalizePublicBookingBaseUrl('http://book.example.com')).toThrow('Use HTTPS');
  });

  it('validates environment values before using the configured fallback', () => {
    expect(resolvePublicBookingBaseUrl(undefined, 'https://sales.example.com/')).toBe('https://sales.example.com');
    expect(() => resolvePublicBookingBaseUrl('http://book.example.com', 'https://sales.example.com')).toThrow('Use HTTPS');
    expect(() => resolvePublicBookingBaseUrl('https://book.example.com/path', 'https://sales.example.com')).toThrow('only the public origin');
  });

  it.each([
    'https://user:pass@book.example.com',
    'https://book.example.com/path',
    'https://book.example.com?source=test',
  ])('rejects an unsafe or misleading origin: %s', (url) => {
    expect(() => normalizePublicBookingBaseUrl(url)).toThrow();
  });
});
