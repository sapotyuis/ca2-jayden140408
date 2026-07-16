import { execSync } from 'child_process';
import request from 'supertest';

let app;

beforeAll(async () => {
  execSync('node src/db/seed.js', { stdio: 'ignore' });
  const mod = await import('../../index.js');
  app = mod.default;
});

// ─── GET /api/users ───────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('should return 200 with an array of users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('should filter by search term (username)', async () => {
    const res = await request(app).get('/api/users?search=Ocean');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    for (const user of res.body) {
      expect(user.username.toLowerCase()).toContain('ocean');
    }
  });

  it('should filter by raft_size', async () => {
    const res = await request(app).get('/api/users?raft_size=3');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const user of res.body) {
      expect(user.raft_size).toBe(3);
    }
  });
});

// ─── GET /api/users/:user_id ──────────────────────────────────────────────────

describe('GET /api/users/:user_id', () => {
  it('should return 200 with a user object for a valid id', async () => {
    const res = await request(app).get('/api/users/rafter_SurvivorJay');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user_id');
    expect(res.body).toHaveProperty('username');
    expect(res.body).toHaveProperty('materials');
    expect(res.body).toHaveProperty('hunger');
    expect(res.body).toHaveProperty('raft_size');
  });

  it('should return 404 for a non-existent id', async () => {
    const res = await request(app).get('/api/users/99999');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('should return 201 with the created user for a valid body', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'NewSurvivor', password: 'securepass' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user_id');
    expect(res.body.username).toBe('NewSurvivor');
    expect(res.body.materials).toBe(0);
    expect(res.body.hunger).toBe(100);
    expect(res.body.raft_size).toBe(1);
  });

  it('should return 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ password: 'securepass' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'AnotherUser' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when username is already taken', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'SurvivorJay', password: 'doesntmatter' });
    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/users/:user_id ──────────────────────────────────────────────────

describe('PUT /api/users/:user_id', () => {
  it('should return 200 with the updated user for a valid id', async () => {
    const res = await request(app)
      .put('/api/users/rafter_SurvivorJay')
      .send({ materials: 99 });
    expect(res.status).toBe(200);
    expect(res.body.materials).toBe(99);
  });

  it('should return 400 when no fields are provided', async () => {
    const res = await request(app)
      .put('/api/users/rafter_SurvivorJay')
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 404 for a non-existent id', async () => {
    const res = await request(app)
      .put('/api/users/99999')
      .send({ materials: 10 });
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/users/:user_id ───────────────────────────────────────────────

describe('DELETE /api/users/:user_id', () => {
  it('should return 204 when deleting an existing user', async () => {
    const created = await request(app)
      .post('/api/users')
      .send({ username: 'ToBeDeleted', password: 'pass' });
    const res = await request(app).delete(`/api/users/${created.body.user_id}`);
    expect(res.status).toBe(204);
  });

  it('should return 404 for a non-existent id', async () => {
    const res = await request(app).delete('/api/users/99999');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/users/:user_id/collect-debris ──────────────────────────────────

describe('POST /api/users/:user_id/collect-debris', () => {
  it('should return 200 with collected materials info', async () => {
    const res = await request(app).post('/api/users/rafter_SurvivorJay/collect-debris');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('collected');
    expect(res.body).toHaveProperty('new_materials');
    expect(typeof res.body.collected).toBe('number');
    expect(res.body.collected).toBeGreaterThan(0);
  });

  it('should return 404 for a non-existent user', async () => {
    const res = await request(app).post('/api/users/99999/collect-debris');
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/users/:user_id/upgrade-raft ────────────────────────────────────

describe('POST /api/users/:user_id/upgrade-raft', () => {
  it('should return 200 with upgrade details when user has enough materials', async () => {
    // rafter_Ocean starts with 50 materials — enough for a Floor Extension (costs 10)
    const res = await request(app)
      .post('/api/users/rafter_Ocean/upgrade-raft')
      .send({ upgrade_type: 'Floor Extension' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('upgrade');
    expect(res.body).toHaveProperty('user');
    expect(res.body.upgrade.upgrade_type).toBe('Floor Extension');
  });

  it('should return 400 when user does not have enough materials', async () => {
    // Create a fresh user with 0 materials — avoids relying on seeded user 1 which may have been mutated by earlier tests
    const created = await request(app)
      .post('/api/users')
      .send({ username: 'PoorUser', password: 'pass' });
    const res = await request(app)
      .post(`/api/users/${created.body.user_id}/upgrade-raft`)
      .send({ upgrade_type: 'Floor Extension' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when upgrade_type is missing', async () => {
    const res = await request(app)
      .post('/api/users/rafter_Ocean/upgrade-raft')
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 400 when upgrade_type is invalid', async () => {
    const res = await request(app)
      .post('/api/users/rafter_Ocean/upgrade-raft')
      .send({ upgrade_type: 'Invalid Upgrade' });
    expect(res.status).toBe(400);
  });

  it('should return 404 for a non-existent user', async () => {
    const res = await request(app)
      .post('/api/users/99999/upgrade-raft')
      .send({ upgrade_type: 'Floor Extension' });
    expect(res.status).toBe(404);
  });
});
