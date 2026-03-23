// 📋 EXAMPLE TEST FILE — use this as a reference when writing tests for your own routes.
// Copy this file, rename it, and adapt the tests for your new API endpoints.

import { execSync } from 'child_process';
import request from 'supertest';

let app;

// Reset the database BEFORE importing the app so the libsql client
// connects to the freshly created file (not a stale/deleted one).
beforeAll(async () => {
  execSync('node src/db/seed.js', { stdio: 'ignore' });
  const mod = await import('../../index.js');
  app = mod.default;
});

describe('GET /api/tasks', () => {
  it('should return 200 with an array of tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });
});

describe('GET /api/tasks/:id', () => {
  it('should return 200 with a task object for a valid id', async () => {
    const res = await request(app).get('/api/tasks/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('completed');
  });

  it('should return 404 for a non-existent id', async () => {
    const res = await request(app).get('/api/tasks/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tasks', () => {
  it('should return 201 with the created task for a valid body', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test task' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Test task');
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('should return 200 with the updated task for a valid id', async () => {
    const res = await request(app)
      .put('/api/tasks/1')
      .send({ title: 'Updated task' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated task');
  });

  it('should return 404 for a non-existent id', async () => {
    const res = await request(app)
      .put('/api/tasks/99999')
      .send({ title: 'Updated' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('should return 204 when deleting an existing task', async () => {
    // Create a task specifically for deletion so seed data stays intact
    const created = await request(app)
      .post('/api/tasks')
      .send({ title: 'To be deleted' });
    const res = await request(app).delete(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('should return 404 for a non-existent id', async () => {
    const res = await request(app).delete('/api/tasks/99999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/tasks with query parameters', () => {
  it('should filter by completed=true', async () => {
    const res = await request(app).get('/api/tasks?completed=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const task of res.body) {
      expect(task.completed).toBe(true);
    }
  });

  it('should filter by search term', async () => {
    const res = await request(app).get('/api/tasks?search=book');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    for (const task of res.body) {
      expect(task.title.toLowerCase()).toContain('book');
    }
  });
});
