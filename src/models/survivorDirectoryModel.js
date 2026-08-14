import { eq, like, and, asc, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
  users,
  raft_upgrades,
  user_items,
  user_quests,
  debris,
  debris_collection_logs,
  user_events,
} from '../db/schema.js';

export { users };

// Excludes password from API responses
const publicUserFields = {
  user_id: users.user_id,
  username: users.username,
  materials: users.materials,
  raft_size: users.raft_size,
  lastLogin: users.lastLogin,
};

/** Get all users. Supports optional `search` (username) and `raft_size` filters. */
export const findAllUsers = async (filters = {}) => {
  const conditions = [];
  if (filters.search) conditions.push(like(users.username, `%${filters.search}%`)); //only runs if there is '?search=...'
  if (filters.raft_size !== undefined) conditions.push(eq(users.raft_size, filters.raft_size));
  if (conditions.length > 0) return await db.select(publicUserFields).from(users).where(and(...conditions));
  return await db.select(publicUserFields).from(users);
};

/** Get the five highest-ranked public survivors without loading the full roster. */
export const findLeaderboardUsers = async (limit = 5) => await db
  .select(publicUserFields)
  .from(users)
  .orderBy(desc(users.raft_size), desc(users.materials), asc(users.username))
  .limit(limit);

/** Get a single user by user_id (integer). Returns undefined if not found. Password is excluded. */
export const findUserById = async (id) => {
  const rows = await db.select(publicUserFields).from(users).where(eq(users.user_id, Number(id)));
  return rows[0];
};

/**
 * Find a user by username, INCLUDING the password hash.
 * Only the auth flow should call this — every other read must use publicUserFields
 * so the hash never reaches a response body.
 * Returns undefined if not found.
 */
export const findUserByUsername = async (username) => {
  const rows = await db.select().from(users).where(eq(users.username, username));
  return rows[0];
};

/**
 * Create a new user. `data.username` and `data.password` are required.
 * user_id is assigned by the database (autoincrement) and returned on the inserted row —
 * the application never constructs it, so it carries no meaning and can never go stale.
 */
export const insertUser = async (data) => {
  const rows = await db.insert(users).values(data).returning(publicUserFields);
  return rows[0];
};

/** Update a user by user_id. Returns undefined if not found. */
export const updateUser = async (id, data) => {
  const rows = await db.update(users).set(data).where(eq(users.user_id, Number(id))).returning(publicUserFields);
  return rows[0];
};

/**
 * Delete a user and every row owned by that user in one transaction.
 *
 * SQLite foreign keys reject deleting the parent first, so dependent records are removed in
 * dependency order before the users row. Keeping the cleanup here also makes account deletion
 * work with existing databases that were created before cascade actions were added to the schema.
 */
export const removeUser = async (id) => db.transaction(async (tx) => {
  const userId = Number(id);

  await tx.delete(debris_collection_logs).where(eq(debris_collection_logs.user_id, userId));
  await tx.delete(user_events).where(eq(user_events.user_id, userId));
  await tx.delete(user_quests).where(eq(user_quests.user_id, userId));
  await tx.delete(raft_upgrades).where(eq(raft_upgrades.user_id, userId));
  await tx.delete(user_items).where(eq(user_items.user_id, userId));
  await tx.delete(debris).where(eq(debris.user_id, userId));

  const rows = await tx.delete(users).where(eq(users.user_id, userId)).returning();
  return rows[0];
});

/** Returns an array of upgrade_type strings applied to a user. */
export const findPlayerUpgradeTypes = async (userId, executor = db) => {
  const rows = await executor
    .select({ upgrade_type: raft_upgrades.upgrade_type })
    .from(raft_upgrades)
    .where(eq(raft_upgrades.user_id, Number(userId)));
  return rows.map((r) => r.upgrade_type);
};

/** Insert an immutable server-side record of a debris collection attempt. */
export const recordDebrisCollection = async (data, executor = db) => {
  const rows = await executor.insert(debris_collection_logs).values(data).returning();
  return rows[0];
};

/** Get the most recent debris collection attempts for one survivor. */
export const findPlayerCollectionLogs = async (userId, limit = 50) => {
  return await db
    .select()
    .from(debris_collection_logs)
    .where(eq(debris_collection_logs.user_id, Number(userId)))
    .orderBy(desc(debris_collection_logs.attempted_at))
    .limit(limit);
};

/**
 * Atomically deducts materials, increases raft_size, and records the upgrade.
 * Both writes succeed or both roll back — no partial state.
 */
export const upgradePlayerRaft = async (userId, newMaterials, newRaftSize, upgradeData, executor = db) => {
  const operation = async (tx) => {
    const [updatedUser] = await tx
      .update(users)
      .set({ materials: newMaterials, raft_size: newRaftSize })
      .where(eq(users.user_id, Number(userId)))
      .returning(publicUserFields);

    const [upgrade] = await tx.insert(raft_upgrades).values(upgradeData).returning();
    return { updatedUser, upgrade };
  };

  return executor === db ? db.transaction(operation) : operation(executor);
};

/**
 * Atomically pays out a completed quest: marks the user_quest row claimed, credits the
 * material reward to the survivor, and — if the quest carries one — grants the reward item.
 * All three writes succeed or roll back together, same pattern as collectDebrisAtomic.
 */
export const claimPlayerQuestReward = async ({ userQuestId, userId, newMaterials, rewardItemTypeId, rewardItemQuantity, executor = db }) => {
  const operation = async (tx) => {
    const now = new Date().toISOString();

    await tx
      .update(user_quests)
      .set({ status: 'claimed', claimed_at: now })
      .where(eq(user_quests.user_quest_id, userQuestId));

    const [updatedUser] = await tx
      .update(users)
      .set({ materials: newMaterials })
      .where(eq(users.user_id, Number(userId)))
      .returning(publicUserFields);

    let grantedItem = null;
    if (rewardItemTypeId && rewardItemQuantity > 0) {
      const [row] = await tx
        .insert(user_items)
        .values({ user_id: Number(userId), item_type_id: rewardItemTypeId, quantity: rewardItemQuantity, acquired_at: now })
        .returning();
      grantedItem = row;
    }

    return { updatedUser, grantedItem };
  };

  return executor === db ? db.transaction(operation) : operation(executor);
};
