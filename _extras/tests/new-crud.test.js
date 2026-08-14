import { execSync } from 'node:child_process';
import express from 'express';
import request from 'supertest';
import { findAllUsers } from '../../src/models/survivorDirectoryModel.js';
import { generateToken } from '../../src/middlewares/jwtMiddleware.js';
import { errorHandler } from '../../src/utils/_errors.js';
import { itemCatalogRouter } from '../../src/routes/itemCatalogRoutes.js';
import { questBoardRouter } from '../../src/routes/questBoardRoutes.js';
import { playerQuestProgressRouter } from '../../src/routes/playerQuestProgressRoutes.js';
import { oceanEventRouter } from '../../src/routes/oceanEventRoutes.js';
import { playerEventHistoryRouter } from '../../src/routes/playerEventHistoryRoutes.js';
import { playerInventoryRouter } from '../../src/routes/playerInventoryRoutes.js';
import { playerRaftUpgradeRouter } from '../../src/routes/playerRaftUpgradeRoutes.js';
import { craftingRecipeRouter } from '../../src/routes/craftingRecipeRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/item-types', itemCatalogRouter);
app.use('/api/quests', questBoardRouter);
app.use('/api/user-quests', playerQuestProgressRouter);
app.use('/api/ocean-events', oceanEventRouter);
app.use('/api/user-events', playerEventHistoryRouter);
app.use('/api/user-items', playerInventoryRouter);
app.use('/api/raft-upgrades', playerRaftUpgradeRouter);
app.use('/api/crafting-recipes', craftingRecipeRouter);
app.use(errorHandler);

let survivorId;
let otherSurvivorId;
let survivorToken;

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

beforeAll(async () => {
  execSync('node src/db/seed.js', { stdio: 'ignore' });
  const users = await findAllUsers();
  survivorId = users.find((user) => user.username === 'SurvivorJay').user_id;
  otherSurvivorId = users.find((user) => user.username === 'Ocean').user_id;
  survivorToken = await createToken(survivorId);
});

const authHeader = () => ({
  Authorization: `Bearer ${survivorToken}`,
});

describe('Shared game-definition reads and write protection', () => {
  it('keeps item types, quests, and ocean events readable', async () => {
    for (const path of ['/api/item-types', '/api/quests', '/api/ocean-events']) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(200);
      expect(Array.isArray(response.body), path).toBe(true);
      expect(response.body.length, path).toBeGreaterThan(0);
    }
  });

  it('does not expose shared game-definition writes to logged-in players', async () => {
    const writes = [
      ['post', '/api/item-types', { item_name: 'Unsafe Item', category: 'material', material_cost: 1, raft_points: 1 }],
      ['patch', '/api/item-types/1', { item_name: 'Unsafe Item' }],
      ['delete', '/api/item-types/1'],
      ['post', '/api/quests', { title: 'Unsafe Quest', description: 'Unsafe', quest_type: 'collect_debris' }],
      ['patch', '/api/quests/1', { title: 'Unsafe Quest' }],
      ['delete', '/api/quests/1'],
      ['post', '/api/ocean-events', { event_name: 'Unsafe Event', description: 'Unsafe', event_type: 'discovery' }],
      ['patch', '/api/ocean-events/1', { event_name: 'Unsafe Event' }],
      ['delete', '/api/ocean-events/1'],
    ];

    for (const [method, path, body] of writes) {
      const response = request(app)[method](path).set(authHeader());
      if (body) response.send(body);
      const result = await response;
      expect(result.status, `${method.toUpperCase()} ${path}`).toBe(404);
    }
  });
});

describe('Crafting recipe management', () => {
  it('does not expose recipe create, update, or delete routes to players', async () => {
    expect((await request(app).get('/api/crafting-recipes')).status).toBe(200);
    expect((await request(app).post('/api/crafting-recipes').set(authHeader()).send({})).status).toBe(404);
    expect((await request(app).patch('/api/crafting-recipes/not-a-recipe-id').set(authHeader()).send({})).status).toBe(404);
    expect((await request(app).delete('/api/crafting-recipes/not-a-recipe-id').set(authHeader())).status).toBe(404);
  });
});

describe('Player record write protection', () => {
  it('keeps player inventory, quest, event, and upgrade records read-only', async () => {
    const writes = [
      ['post', '/api/user-items', { user_id: survivorId, item_type_id: 1, quantity: 999 }],
      ['patch', '/api/user-items/1', { quantity: 999 }],
      ['delete', '/api/user-items/1'],
      ['post', '/api/user-quests', { user_id: survivorId, quest_id: 1, progress: 999, status: 'completed' }],
      ['patch', '/api/user-quests/1', { progress: 999, status: 'completed' }],
      ['delete', '/api/user-quests/1'],
      ['post', '/api/user-events', { user_id: survivorId, event_id: 1, outcome: 'Forged event' }],
      ['patch', '/api/user-events/1', { outcome: 'Forged event' }],
      ['delete', '/api/user-events/1'],
      ['post', '/api/raft-upgrades', { user_id: survivorId, upgrade_type: 'Spear Rack', material_cost: 0 }],
      ['patch', '/api/raft-upgrades/1', { material_cost: 0 }],
      ['delete', '/api/raft-upgrades/1'],
    ];

    for (const [method, path, body] of writes) {
      const response = request(app)[method](path).set(authHeader());
      if (body) response.send(body);
      const result = await response;
      expect(result.status, `${method.toUpperCase()} ${path}`).toBe(404);
    }
  });
});

describe('Owner-scoped user record reads', () => {
  it('requires authentication for user-specific record lists and details', async () => {
    for (const path of ['/api/user-items', '/api/user-quests', '/api/user-events', '/api/raft-upgrades']) {
      expect((await request(app).get(path)).status, path).toBe(401);
    }

    for (const path of ['/api/user-items/999999', '/api/user-quests/999999', '/api/user-events/999999', '/api/raft-upgrades/999999']) {
      expect((await request(app).get(path)).status, path).toBe(401);
    }
  });

  it('does not allow a user_id query to read another survivor\'s records', async () => {
    for (const path of ['/api/user-items', '/api/user-quests', '/api/user-events', '/api/raft-upgrades']) {
      const response = await request(app).get(`${path}?user_id=${otherSurvivorId}`).set(authHeader());
      expect(response.status, path).toBe(200);
      expect(response.body.every((row) => row.user_id === survivorId), path).toBe(true);
    }
  });

});
