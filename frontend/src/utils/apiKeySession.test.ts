import { describe, expect, it, vi } from 'vitest';
import { createAuthSessionKey } from './apiKeySession';

describe('createAuthSessionKey', () => {
  it('creates opaque identifiers that do not contain API Key fragments', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValueOnce('00000000-0000-4000-8000-000000000001');
    const apiKey = 'sk_live_super_secret_last6';

    const sessionKey = createAuthSessionKey();

    expect(sessionKey).toBe('00000000-0000-4000-8000-000000000001');
    expect(sessionKey).not.toContain(apiKey);
    expect(sessionKey).not.toContain(apiKey.slice(-6));
  });
});
