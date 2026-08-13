import express from 'express';
import request from 'supertest';
import { generateToken } from '../../src/middlewares/jwtMiddleware.js';
import { errorHandler } from '../../src/utils/_errors.js';
import { questRouter } from '../../src/routes/questRoutes.js';
import { userQuestRouter } from '../../src/routes/userQuestRoutes.js';
import { oceanEventRouter } from '../../src/routes/oceanEventRoutes.js';
import { userEventRouter } from '../../src/routes/userEventRoutes.js';
import { userItemRouter } from '../../src/routes/userItemRoutes.js';
import { raftUpgradeRouter } from '../../src/routes/raftUpgradeRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/quests', questRouter);
app.use('/api/user-quests', userQuestRouter);
app.use('/api/ocean-events', oceanEventRouter);
app.use('/api/user-events', userEventRouter);
app.use('/api/user-items', userItemRouter);
app.use('/api/raft-upgrades', raftUpgradeRouter);
app.use(errorHandler);

// user_id is an autoincrement integer; the seed inserts SurvivorJay first and Ocean second.
const survivorId = 1;
const otherSurvivorId = 2;

const createToken = (userId) => new Promise((resolve, reject) => {
  const response = {
    locals: { userId },
    status() {
      return this;
    },
    json(error) {
      reject(error);
      return this;
    },
  };

  try {
    generateToken({}, response, () => resolve(response.locals.token));
  } catch (error) {
    reject(error);
  }
});

const survivorToken = await createToken(survivorId);
const otherSurvivorToken = await createToken(otherSurvivorId);

const authHeader = (userId = survivorId) => ({
  Authorization: `Bearer ${userId === survivorId ? survivorToken : otherSurvivorToken}`,
});

describe('Quest CRUD', () => {
  it('supports list, detail, create, patch, and delete', async () => {
    const list = await request(app).get('/api/quests');
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(3);

    const created = await request(app)
      .post('/api/quests')
      .set(authHeader())
      .send({
        title: 'Test Quest',
        description: 'A quest created by the CRUD test.',
        quest_type: 'collect_debris',
        target_value: 2,
        reward_materials: 10,
        min_raft_size: 1,
      });
    expect(created.status).toBe(201);

    const questId = created.body.quest_id;
    const detail = await request(app).get(`/api/quests/${questId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.title).toBe('Test Quest');

    const patched = await request(app)
      .patch(`/api/quests/${questId}`)
      .set(authHeader())
      .send({ target_value: 3 });
    expect(patched.status).toBe(200);
    expect(patched.body.target_value).toBe(3);

    const deleted = await request(app).delete(`/api/quests/${questId}`).set(authHeader());
    expect(deleted.status).toBe(204);
  });
});

describe('Ocean event CRUD', () => {
  it('supports list, detail, create, patch, and delete', async () => {
    const list = await request(app).get('/api/ocean-events');
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(4);

    const created = await request(app)
      .post('/api/ocean-events')
      .set(authHeader())
      .send({
        event_name: 'Test Current',
        description: 'A current used by the CRUD test.',
        event_type: 'discovery',
        min_raft_size: 1,
        risk_percent: 15,
        min_materials: 1,
        max_materials: 4,
      });
    expect(created.status).toBe(201);

    const eventId = created.body.event_id;
    const detail = await request(app).get(`/api/ocean-events/${eventId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.event_name).toBe('Test Current');

    const patched = await request(app)
      .patch(`/api/ocean-events/${eventId}`)
      .set(authHeader())
      .send({ risk_percent: 25 });
    expect(patched.status).toBe(200);
    expect(patched.body.risk_percent).toBe(25);

    const deleted = await request(app).delete(`/api/ocean-events/${eventId}`).set(authHeader());
    expect(deleted.status).toBe(204);
  });
});

describe('User quest CRUD', () => {
  it('supports list, detail, create, patch, and delete for the authenticated owner', async () => {
    const list = await request(app).get(`/api/user-quests?user_id=${survivorId}`).set(authHeader());
    expect(list.status).toBe(200);

    // quest_id 1 is skipped here — the seed data already gives survivorId a progress row for
    // it, and user_quests now enforces one row per (user_id, quest_id) pair.
    const created = await request(app)
      .post('/api/user-quests')
      .set(authHeader())
      .send({ user_id: survivorId, quest_id: 2, progress: 0, status: 'active' });
    expect(created.status).toBe(201);

    const userQuestId = created.body.user_quest_id;
    const detail = await request(app).get(`/api/user-quests/${userQuestId}`).set(authHeader());
    expect(detail.status).toBe(200);

    const patched = await request(app)
      .patch(`/api/user-quests/${userQuestId}`)
      .set(authHeader())
      .send({ progress: 1 });
    expect(patched.status).toBe(200);
    expect(patched.body.progress).toBe(1);

    const deleted = await request(app).delete(`/api/user-quests/${userQuestId}`).set(authHeader());
    expect(deleted.status).toBe(204);
  });
});

describe('User event CRUD', () => {
  it('supports list, detail, create, patch, and delete for the authenticated owner', async () => {
    const created = await request(app)
      .post('/api/user-events')
      .set(authHeader())
      .send({
        user_id: survivorId,
        event_id: 1,
        outcome: 'Found a test bottle.',
        materials_change: 2,
        reward_item_type_id: 9,
        reward_item_quantity: 1,
        occurred_at: '2026-01-15T09:00:00.000Z',
      });
    expect(created.status).toBe(201);

    const userEventId = created.body.user_event_id;
    expect((await request(app).get('/api/user-events').set(authHeader())).status).toBe(200);
    expect((await request(app).get(`/api/user-events/${userEventId}`).set(authHeader())).status).toBe(200);

    const patched = await request(app)
      .patch(`/api/user-events/${userEventId}`)
      .set(authHeader())
      .send({ outcome: 'Found the test bottle safely.' });
    expect(patched.status).toBe(200);

    const forbidden = await request(app)
      .patch(`/api/user-events/${userEventId}`)
      .set(authHeader(otherSurvivorId))
      .send({ outcome: 'Should not be allowed.' });
    expect(forbidden.status).toBe(404);

    const deleted = await request(app).delete(`/api/user-events/${userEventId}`).set(authHeader());
    expect(deleted.status).toBe(204);
  });
});

describe('Owner-scoped user record reads', () => {
  it('requires authentication for user-specific record lists', async () => {
    for (const path of ['/api/user-items', '/api/user-quests', '/api/user-events', '/api/raft-upgrades']) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(401);
    }

    for (const path of [
      '/api/user-items/999999',
      '/api/user-quests/999999',
      '/api/user-events/999999',
      '/api/raft-upgrades/999999',
    ]) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(401);
    }
  });

  it('does not allow a user_id query to read another survivor\'s records', async () => {
    for (const path of ['/api/user-items', '/api/user-quests', '/api/user-events', '/api/raft-upgrades']) {
      const response = await request(app)
        .get(`${path}?user_id=${otherSurvivorId}`)
        .set(authHeader());
      expect(response.status, path).toBe(200);
      expect(response.body.every((row) => row.user_id === survivorId)).toBe(true);
    }
  });

  it('does not allow an authenticated user to mutate another survivor\'s inventory or upgrades', async () => {
    const items = await request(app).get('/api/user-items').set(authHeader());
    const upgrades = await request(app).get('/api/raft-upgrades').set(authHeader());
    expect(items.body.length).toBeGreaterThan(0);
    expect(upgrades.body.length).toBeGreaterThan(0);

    const itemId = items.body[0].user_item_id;
    const upgradeId = upgrades.body[0].upgrade_id;

    const itemCreate = await request(app)
      .post('/api/user-items')
      .set(authHeader(otherSurvivorId))
      .send({ user_id: survivorId, item_type_id: 1, quantity: 1 });
    expect(itemCreate.status).toBe(400);

    const upgradeCreate = await request(app)
      .post('/api/raft-upgrades')
      .set(authHeader(otherSurvivorId))
      .send({ user_id: survivorId, upgrade_type: 'Floor Extension', material_cost: 10 });
    expect(upgradeCreate.status).toBe(400);

    const itemPatch = await request(app)
      .patch(`/api/user-items/${itemId}`)
      .set(authHeader(otherSurvivorId))
      .send({ quantity: 99 });
    expect(itemPatch.status).toBe(404);

    const upgradePatch = await request(app)
      .patch(`/api/raft-upgrades/${upgradeId}`)
      .set(authHeader(otherSurvivorId))
      .send({ material_cost: 99 });
    expect(upgradePatch.status).toBe(404);
  });
});

describe('Middleware protection', () => {
  it('rejects writes without a bearer token', async () => {
    const res = await request(app)
      .post('/api/quests')
      .send({ title: 'Unauthorised', description: 'No token', quest_type: 'collect_debris' });

    expect(res.status).toBe(401);
  });
});
