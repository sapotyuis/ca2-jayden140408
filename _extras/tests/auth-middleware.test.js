import jwt from 'jsonwebtoken';
import { comparePassword, hashPassword } from '../../src/middlewares/bcryptMiddleware.js';
import { generateToken, sendToken, verifyToken } from '../../src/middlewares/jwtMiddleware.js';

const createResponse = (locals = {}) => ({
  locals,
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const runMiddleware = (middleware, req, res) => new Promise((resolve, reject) => {
  let settled = false;
  const finish = (result) => {
    if (!settled) {
      settled = true;
      resolve(result);
    }
  };

  const next = () => finish({ type: 'next' });
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const response = originalJson(body);
    finish({ type: 'response', response });
    return response;
  };

  try {
    const returned = middleware(req, res, next);
    if (returned && typeof returned.then === 'function') {
      returned.then((value) => finish({ type: 'return', value })).catch(reject);
    } else if (returned !== undefined) {
      finish({ type: 'return', value: returned });
    }
  } catch (error) {
    reject(error);
  }
});

describe('whitepaper bcrypt middleware', () => {
  it('hashes into res.locals and allows matching passwords through', async () => {
    expect(hashPassword).toHaveLength(3);
    expect(comparePassword).toHaveLength(3);

    const hashResponse = createResponse();
    const hashResult = await runMiddleware(hashPassword, { body: { password: 'password123' } }, hashResponse);

    expect(hashResult.type).toBe('next');
    expect(hashResponse.locals.hash).toMatch(/^\$2[aby]\$/);

    const compareResponse = createResponse({ hash: hashResponse.locals.hash });
    const compareResult = await runMiddleware(comparePassword, { body: { password: 'password123' } }, compareResponse);
    expect(compareResult.type).toBe('next');
  });

  it('rejects a wrong password with the whitepaper response', async () => {
    const hashResponse = createResponse();
    await runMiddleware(hashPassword, { body: { password: 'password123' } }, hashResponse);

    const compareResponse = createResponse({ hash: hashResponse.locals.hash });
    const compareResult = await runMiddleware(comparePassword, { body: { password: 'wrong-password' } }, compareResponse);

    expect(compareResult.type).toBe('response');
    expect(compareResponse.statusCode).toBe(401);
    expect(compareResponse.body).toEqual({ message: 'Wrong password' });
  });
});

describe('whitepaper JWT middleware', () => {
  it('generates, sends, and verifies a token through res.locals', async () => {
    expect(generateToken).toHaveLength(3);
    expect(sendToken).toHaveLength(3);
    expect(verifyToken).toHaveLength(3);

    const generateResponse = createResponse({ userId: 1 });
    const generateResult = await runMiddleware(generateToken, {}, generateResponse);
    expect(generateResult.type).toBe('next');
    expect(generateResponse.locals.token).toBeTruthy();

    const sendResponse = createResponse({ message: 'Login successful', token: generateResponse.locals.token });
    sendToken({}, sendResponse, () => {});
    expect(sendResponse.statusCode).toBe(200);
    expect(sendResponse.body).toEqual({
      message: 'Login successful',
      token: generateResponse.locals.token,
    });

    const verifyResponse = createResponse();
    const verifyResult = await runMiddleware(
      verifyToken,
      { headers: { authorization: `Bearer ${generateResponse.locals.token}` } },
      verifyResponse
    );
    expect(verifyResult.type).toBe('next');
    // toBe is strict, so this also pins that the JWT round-trip preserves the integer type
    // rather than handing back "1" — loadCurrentUser and the ownership checks rely on it.
    expect(verifyResponse.locals.userId).toBe(1);
    expect(verifyResponse.locals.tokenTimestamp).toBeTruthy();
  });

  it('uses the whitepaper responses for missing and invalid tokens', async () => {
    const missingResponse = createResponse();
    const missingResult = await runMiddleware(verifyToken, { headers: {} }, missingResponse);
    expect(missingResult.type).toBe('response');
    expect(missingResponse.statusCode).toBe(401);
    expect(missingResponse.body).toEqual({ error: 'Invalid token' });

    const invalidResponse = createResponse();
    const invalidResult = await runMiddleware(
      verifyToken,
      { headers: { authorization: 'Bearer definitely-not-a-token' } },
      invalidResponse
    );
    expect(invalidResult.type).toBe('response');
    expect(invalidResponse.statusCode).toBe(401);
    expect(invalidResponse.body).toEqual({ error: 'Invalid token' });
  });
});
