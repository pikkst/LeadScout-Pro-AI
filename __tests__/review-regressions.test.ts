import { describe, expect, it } from 'vitest';
import { isSameHostBrowserOrigin } from '../server/middleware/auth';
import { canCancelMeeting } from '../server/utils/calendarBooking';
import { decryptSecretWithKeyring, encryptSecretWithKey } from '../server/utils/crypto';

const agent = { id: 'agent-1', email: 'agent@example.com', name: 'Agent', role: 'AGENT' as const };

describe('review regression coverage', () => {
  it('lets an agent cancel a directly owned or legacy slot-owned meeting', () => {
    expect(canCancelMeeting(agent, { agentId: 'agent-1' })).toBe(true);
    expect(canCancelMeeting(agent, { agentId: null, slots: [{ agentId: 'agent-1' }] })).toBe(true);
    expect(canCancelMeeting(agent, { agentId: null, slots: [{ agentId: 'agent-2' }] })).toBe(false);
  });

  it('accepts the browser origin when host matches across a TLS proxy', () => {
    expect(isSameHostBrowserOrigin('https://sales.example.com', 'sales.example.com')).toBe(true);
    expect(isSameHostBrowserOrigin('https://sales.example.com:8443', 'sales.example.com:8443')).toBe(true);
    expect(isSameHostBrowserOrigin('https://attacker.example', 'sales.example.com')).toBe(false);
  });

  it('decrypts an old settings key and identifies it for automatic rotation', () => {
    const stored = encryptSecretWithKey('smtp-secret', 'former-key');
    const decrypted = decryptSecretWithKeyring(stored, 'new-key', ['former-key']);
    expect(decrypted).toEqual({ value: 'smtp-secret', needsRotation: true, decrypted: true });

    const rotated = encryptSecretWithKey(decrypted.value, 'new-key');
    expect(decryptSecretWithKeyring(rotated, 'new-key', ['former-key'])).toEqual({
      value: 'smtp-secret',
      needsRotation: false,
      decrypted: true,
    });
  });
});
