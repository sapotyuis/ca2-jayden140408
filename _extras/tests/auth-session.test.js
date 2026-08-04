import { isTokenExpired, readStoredSession } from '../../frontend/src/lib/api.js';

const tokenWithExpiry = (exp) => {
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `header.${payload}.signature`;
};

describe('stored JWT sessions', () => {
  it('recognises a token whose expiry is in the past', () => {
    expect(isTokenExpired(tokenWithExpiry(1_700_000_000), 1_700_000_001)).toBe(true);
  });

  it('keeps a token whose expiry is still in the future', () => {
    expect(isTokenExpired(tokenWithExpiry(1_700_000_001), 1_700_000_000)).toBe(false);
  });

  it('clears an expired token instead of restoring it as a session', () => {
    const values = new Map([
      ['cc_token', tokenWithExpiry(1_700_000_000)],
      ['cc_user', JSON.stringify({ username: 'old-session' })],
    ]);
    globalThis.localStorage = {
      getItem: (key) => values.get(key) || null,
      removeItem: (key) => values.delete(key),
    };

    expect(readStoredSession()).toBeNull();
    expect(values.has('cc_token')).toBe(false);
    delete globalThis.localStorage;
  });
});
