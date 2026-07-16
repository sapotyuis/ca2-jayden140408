import { eq, like, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users, raft_upgrades, user_items } from '../db/schema.js';

export { users };

// Excludes password from API responses
const publicUserFields = {
  user_id: users.user_id,
  username: users.username,
  materials: users.materials,
  hunger: users.hunger,
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

/** Get a single user by user_id (varchar). Returns undefined if not found. Password is excluded. */
export const findUserById = async (id) => {
  const rows = await db.select(publicUserFields).from(users).where(eq(users.user_id, String(id)));
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

/** Create a new user. `data.username` and `data.password` are required. user_id is auto-generated as rafter_<username>. */
export const insertUser = async (data) => {
  const values = { ...data, user_id: `rafter_${data.username}` };
  const rows = await db.insert(users).values(values).returning(publicUserFields);
  return rows[0];
};

/** Update a user by user_id. Returns undefined if not found. */
export const updateUser = async (id, data) => {
  const rows = await db.update(users).set(data).where(eq(users.user_id, String(id))).returning(publicUserFields);
  return rows[0];
};

/** Delete a user by user_id. Returns undefined if not found. */
export const removeUser = async (id) => {
  const rows = await db.delete(users).where(eq(users.user_id, String(id))).returning();
  return rows[0];
};

/** Returns an array of upgrade_type strings applied to a user. */
export const findUserUpgradeTypes = async (userId) => {
  const rows = await db
    .select({ upgrade_type: raft_upgrades.upgrade_type })
    .from(raft_upgrades)
    .where(eq(raft_upgrades.user_id, String(userId)));
  return rows.map((r) => r.upgrade_type);
};

/**
 * Atomically adds materials to a user and inserts debris items into user_items.
 * Both succeed or both roll back.
 * tx -> transaction version of db. Any database changes with tx are grouped together. If everything succeeds, they are saved. If one fails, all changes with tx are cancelled
 */
export const collectDebrisAtomic = async (userId, newMaterials, debrisItems) => {
  return await db.transaction(async (tx) => {
    const [updatedUser] = await tx
      .update(users)
      .set({ materials: newMaterials })
      .where(eq(users.user_id, String(userId)))
      .returning(publicUserFields);

    const now = new Date().toISOString();
    const insertedItems = [];
    for (const item of debrisItems) {
      await tx.insert(user_items).values({ user_id: String(userId), item_type_id: item.item_type_id, quantity: item.quantity, acquired_at: now });
      insertedItems.push({ item_name: item.item_name, quantity: item.quantity });
    }
    return { updatedUser, insertedItems };
  });
};

/**
 * Atomically deducts materials, increases raft_size, and records the upgrade.
 * Both writes succeed or both roll back — no partial state.
 */
export const upgradeRaftAtomic = async (userId, newMaterials, newRaftSize, upgradeData) => {
  return await db.transaction(async (tx) => {
    const [updatedUser] = await tx
      .update(users)
      .set({ materials: newMaterials, raft_size: newRaftSize })
      .where(eq(users.user_id, String(userId)))
      .returning(publicUserFields);

    const [upgrade] = await tx.insert(raft_upgrades).values(upgradeData).returning();
    return { updatedUser, upgrade };
  });
};
