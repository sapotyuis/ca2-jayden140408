import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { raft_upgrades } from '../db/schema.js';

export { raft_upgrades };

/** Get all raft upgrades. Supports optional `user_id` and `upgrade_type` filters. */
export const findAllRaftUpgrades = async (filters = {}) => {
  const conditions = [];

  if (filters.user_id !== undefined) {
    conditions.push(eq(raft_upgrades.user_id, filters.user_id));
  }

  if (filters.upgrade_type !== undefined) {
    conditions.push(eq(raft_upgrades.upgrade_type, filters.upgrade_type));
  }

  if (conditions.length > 0) {
    return await db.select().from(raft_upgrades).where(and(...conditions));
  }

  return await db.select().from(raft_upgrades);
};

/** Get a single raft upgrade by ID. Returns undefined if not found. */
export const findRaftUpgradeById = async (id) => {
  const rows = await db.select().from(raft_upgrades).where(eq(raft_upgrades.upgrade_id, Number(id)));
  return rows[0];
};

/** Create a new raft upgrade. */
export const insertRaftUpgrade = async (data) => {
  const rows = await db.insert(raft_upgrades).values(data).returning();
  return rows[0];
};

/** Update a raft upgrade by ID. Returns undefined if not found. */
export const updateRaftUpgrade = async (id, data) => {
  const rows = await db.update(raft_upgrades).set(data).where(eq(raft_upgrades.upgrade_id, Number(id))).returning();
  return rows[0];
};

/** Delete a raft upgrade by ID. Returns undefined if not found. */
export const removeRaftUpgrade = async (id) => {
  const rows = await db.delete(raft_upgrades).where(eq(raft_upgrades.upgrade_id, Number(id))).returning();
  return rows[0];
};
