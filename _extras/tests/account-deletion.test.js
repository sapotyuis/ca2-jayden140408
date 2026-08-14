import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ deletedTables: [] }));

vi.mock('../../src/db/connection.js', () => ({
  db: {
    transaction: async (callback) => callback({
      delete(table) {
        state.deletedTables.push(table);
        return {
          where: () => ({ returning: async () => [] }),
        };
      },
    }),
  },
}));

import { removeUser } from '../../src/models/survivorDirectoryModel.js';
import {
  debris,
  debris_collection_logs,
  raft_upgrades,
  user_events,
  user_items,
  user_quests,
  users,
} from '../../src/db/schema.js';

describe('account deletion', () => {
  it('deletes owned child records before deleting the user row in one transaction', async () => {
    state.deletedTables.length = 0;

    await removeUser(42);

    expect(state.deletedTables).toEqual([
      debris_collection_logs,
      user_events,
      user_quests,
      raft_upgrades,
      user_items,
      debris,
      users,
    ]);
  });
});
