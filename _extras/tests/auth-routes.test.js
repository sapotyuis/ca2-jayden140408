import express from 'express';
import request from 'supertest';
import { authRouter } from '../../src/routes/authRoutes.js';
import { meRouter } from '../../src/routes/meRoutes.js';
import { errorHandler } from '../../src/utils/_errors.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use(errorHandler);

const username = `Whitepaper${Date.now()}`;
const password = 'password123';
let token;

describe('whitepaper authentication flow', () => {
  it('registers through hashPassword middleware', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username, password });

    expect(response.status).toBe(201);
    expect(response.body.user.username).toBe(username);
    expect(response.body.user.password).toBeUndefined();
  });

  it('logs in through comparePassword, generateToken, and sendToken', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username, password });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.token).toBeTruthy();
    token = response.body.token;
  });

  it('lets the verified token reach the current-user middleware', async () => {
    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.username).toBe(username);
  });

  it('returns the whitepaper wrong-password response', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'incorrect-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Wrong password' });
  });
});
