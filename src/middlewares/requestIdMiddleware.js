import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

/** Attach a safe correlation id to every response, preserving a valid incoming id when supplied. */
export const requestIdMiddleware = (req, res, next) => {
  const incoming = req.get?.('x-request-id') || req.headers?.['x-request-id'];
  const requestId = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
    ? incoming
    : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

/** Log every routed request after Express has selected its final status code. */
export const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.once('finish', () => {
    console.log('[API] request completed', {
      request_id: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - startedAt,
    });
  });

  next();
};

/** Log request context before the shared error handler emits its safe public response. */
export const requestErrorLogger = (err, req, res, next) => {
  console.error({
    request_id: req.requestId,
    method: req.method,
    path: req.originalUrl,
    error_code: err.code,
    error_message: err.message,
  });
  next(err);
};
