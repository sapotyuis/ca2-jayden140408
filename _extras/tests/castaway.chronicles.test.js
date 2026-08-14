import { execSync } from 'node:child_process';
import request from 'supertest';

let app;
let survivorId;
let token;

beforeAll(async () => {
  execSync('node src/db/seed.js', { stdio: 'ignore' });
  const mod = await import('../../index.js');
  app = mod.default;

  const users = await request(app).get('/api/users?search=SurvivorJay');
  survivorId = users.body[0].user_id;

  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'SurvivorJay', password: 'password123' });
  token = login.body.token;
});

describe('Public survivor directory', () => {
  it('returns public survivor records without password hashes', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(3);
    expect(response.body.every((user) => user.password === undefined)).toBe(true);
  });

  it('supports username and raft-size query filters', async () => {
    const byName = await request(app).get('/api/users?search=Ocean');
    expect(byName.status).toBe(200);
    expect(byName.body.every((user) => user.username.toLowerCase().includes('ocean'))).toBe(true);

    const byRaftSize = await request(app).get('/api/users?raft_size=3');
    expect(byRaftSize.status).toBe(200);
    expect(byRaftSize.body.every((user) => user.raft_size === 3)).toBe(true);
  });

  it('returns one public profile and rejects an unknown profile', async () => {
    const profile = await request(app).get(`/api/users/${survivorId}`);
    expect(profile.status).toBe(200);
    expect(profile.body.username).toBe('SurvivorJay');
    expect(profile.body.password).toBeUndefined();

    expect((await request(app).get('/api/users/999999')).status).toBe(404);
  });
});

describe('Public survivor write protection', () => {
  it('does not expose account or gameplay writes through /api/users', async () => {
    expect((await request(app).post('/api/users').send({ username: 'Unsafe', password: 'password123' })).status).toBe(404);
    expect((await request(app).patch(`/api/users/${survivorId}`).send({ materials: 999 })).status).toBe(404);
    expect((await request(app).delete(`/api/users/${survivorId}`)).status).toBe(404);
    expect((await request(app).post(`/api/users/${survivorId}/collect-debris`)).status).toBe(404);
    expect((await request(app).post(`/api/users/${survivorId}/upgrade-raft`).send({ upgrade_type: 'Sail' })).status).toBe(404);
  });
});

describe('API error responses', () => {
  it('returns a structured 400 response for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
        status: 400,
      },
    });
  });

  it('returns a structured 404 response for an unknown API route', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'API route not found',
        status: 404,
      },
    });
  });
});

describe('Authenticated survivor actions', () => {
  it('allows a valid token to reach the authenticated profile route', async () => {
    const response = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.username).toBe('SurvivorJay');
  });

  it('rejects protected actions without a token', async () => {
    expect((await request(app).get('/api/me/status')).status).toBe(401);
    expect((await request(app).post('/api/me/craft').send({ result_item_type_id: 4 })).status).toBe(401);
  });
});
