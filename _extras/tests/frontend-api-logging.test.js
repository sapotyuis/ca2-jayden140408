import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedFetch, loginRequest } from '../../frontend/js/lib/api.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('frontend API diagnostics', () => {
  it('logs a safe request and response summary without logging the request body', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'Login successful', token: 'secret-token' }),
      { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'login-42' } },
    )));

    await loginRequest('SurvivorJay', 'password123');

    expect(log).toHaveBeenCalledWith('[FRONTEND] API request started', expect.objectContaining({
      method: 'POST',
      path: '/api/auth/login',
    }));
    expect(log).toHaveBeenCalledWith('[FRONTEND] API response received', expect.objectContaining({
      status: 200,
      request_id: 'login-42',
    }));
    expect(log.mock.calls.flat().join(' ')).not.toContain('password123');
    expect(log.mock.calls.flat().join(' ')).not.toContain('secret-token');
  });

  it('logs network failures with the endpoint and safe error message', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')));

    await expect(authedFetch('/api/me/status', 'secret-token')).rejects.toThrow('Network unavailable');

    expect(errorLog).toHaveBeenCalledWith('[FRONTEND] API request failed', expect.objectContaining({
      method: 'GET',
      path: '/api/me/status',
      message: 'Network unavailable',
    }));
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain('secret-token');
  });
});
