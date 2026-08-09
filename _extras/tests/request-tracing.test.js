import { describe, expect, it, vi } from 'vitest';
import { requestIdMiddleware, requestLogger } from '../../src/middlewares/requestIdMiddleware.js';

describe('request tracing', () => {
  it('echoes a request id so server errors can be matched to logs', async () => {
    const response = {
      headers: {},
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
    };
    const request = {
      headers: { 'x-request-id': 'audit-request-42' },
      get(name) {
        return this.headers[name.toLowerCase()];
      },
    };
    let continued = false;

    requestIdMiddleware(request, response, () => { continued = true; });

    expect(continued).toBe(true);
    expect(response.headers['x-request-id']).toBe('audit-request-42');
  });

  it('logs the completed request with status, duration, and correlation id', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const request = {
      method: 'POST',
      originalUrl: '/api/me/debris/debris-42/collect',
      requestId: 'audit-request-42',
    };
    const response = {
      statusCode: 200,
      once(event, callback) {
        expect(event).toBe('finish');
        callback();
      },
    };
    let continued = false;

    requestLogger(request, response, () => { continued = true; });

    expect(continued).toBe(true);
    expect(log).toHaveBeenCalledWith('[API] request completed', expect.objectContaining({
      request_id: 'audit-request-42',
      method: 'POST',
      path: '/api/me/debris/debris-42/collect',
      status: 200,
    }));
    log.mockRestore();
  });
});
