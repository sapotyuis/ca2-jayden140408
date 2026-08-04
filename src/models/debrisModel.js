import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { debris, debris_collection_logs, item_types, user_items, users } from '../db/schema.js';
import { chooseDebrisSpawnPosition, chooseStarterItemName } from '../utils/debrisSpawn.js';

// Scaled up with the spawn field in utils/debrisSpawn.js: the ocean is far larger than it was, so
// a handful of active pieces would leave the survivor sailing through empty water for too long.
const TARGET_ACTIVE_DEBRIS = 14;

const debrisDetails = {
  debris_id: debris.debris_id,
  item_type_id: debris.item_type_id,
  item_name: item_types.item_name,
  category: item_types.category,
  quantity: debris.quantity,
  x_position: debris.x_position,
  z_position: debris.z_position,
  spawned_at: debris.spawned_at,
};

/** Returns only unclaimed debris owned by the current survivor. */
export const findActiveDebrisForUser = async (userId) => {
  return await db
    .select(debrisDetails)
    .from(debris)
    .innerJoin(item_types, eq(debris.item_type_id, item_types.item_type_id))
    .where(and(eq(debris.user_id, String(userId)), isNull(debris.claimed_at)))
    .orderBy(desc(debris.spawned_at));
};

/** Ensures a survivor has a small server-owned field of collectible debris. */
export const ensureActiveDebris = async (userId) => {
  const active = await findActiveDebrisForUser(userId);
  if (active.length >= TARGET_ACTIVE_DEBRIS) return active;

  const catalog = await db
    .select({ item_type_id: item_types.item_type_id, item_name: item_types.item_name, category: item_types.category })
    .from(item_types);
  if (catalog.length === 0) return active;

  const byName = new Map(catalog.map((item) => [item.item_name, item]));
  const eligible = catalog.filter((item) => ['material', 'food', 'equipment'].includes(item.category));
  const spawnCount = TARGET_ACTIVE_DEBRIS - active.length;
  const now = new Date().toISOString();
  const recentClaims = await db
    .select({
      x_position: debris.x_position,
      z_position: debris.z_position,
      item_name: item_types.item_name,
    })
    .from(debris)
    .innerJoin(item_types, eq(debris.item_type_id, item_types.item_type_id))
    .where(and(eq(debris.user_id, String(userId)), isNotNull(debris.claimed_at)))
    .orderBy(desc(debris.claimed_at))
    .limit(1);
  const occupiedPositions = active.map((row) => [Number(row.x_position), Number(row.z_position)]);
  const recentlyClaimedPositions = recentClaims.map((row) => [Number(row.x_position), Number(row.z_position)]);
  let previousItemName = recentClaims[0]?.item_name;

  for (let index = 0; index < spawnCount; index += 1) {
    const preferred = chooseStarterItemName({
      recentlyClaimedItemName: previousItemName,
      activeCount: active.length + index,
    });
    const item = byName.get(preferred) || eligible[Math.floor(Math.random() * eligible.length)] || catalog[0];
    const [x, z] = chooseDebrisSpawnPosition({
      activePositions: occupiedPositions,
      recentlyClaimedPositions,
      random: Math.random,
    });
    await db.insert(debris).values({
      debris_id: randomUUID(),
      user_id: String(userId),
      item_type_id: item.item_type_id,
      quantity: item.category === 'equipment' ? 1 : 1 + Math.floor(Math.random() * 2),
      x_position: x,
      z_position: z,
      spawned_at: now,
    });
    occupiedPositions.push([x, z]);
    previousItemName = item.item_name;
  }

  return await findActiveDebrisForUser(userId);
};

/** Claims one server-owned debris row and grants its item exactly once. */
export const collectDebrisByIdAtomic = async (userId, debrisId, attemptedAt = new Date().toISOString()) => {
  return await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(debris)
      .set({ claimed_at: attemptedAt })
      .where(and(
        eq(debris.debris_id, String(debrisId)),
        eq(debris.user_id, String(userId)),
        isNull(debris.claimed_at),
      ))
      .returning();

    if (!claimed) return null;

    const [item] = await tx
      .select({
        item_type_id: item_types.item_type_id,
        item_name: item_types.item_name,
        category: item_types.category,
      })
      .from(item_types)
      .where(eq(item_types.item_type_id, claimed.item_type_id));

    const [user] = await tx
      .select({
        user_id: users.user_id,
        username: users.username,
        materials: users.materials,
        hunger: users.hunger,
        raft_size: users.raft_size,
      })
      .from(users)
      .where(eq(users.user_id, String(userId)));

    const collectedMaterials = item.category === 'material' ? claimed.quantity : 0;
    const [updatedUser] = await tx
      .update(users)
      .set({ materials: user.materials + collectedMaterials })
      .where(eq(users.user_id, String(userId)))
      .returning({
        user_id: users.user_id,
        username: users.username,
        materials: users.materials,
        hunger: users.hunger,
        raft_size: users.raft_size,
      });

    await tx.insert(user_items).values({
      user_id: String(userId),
      item_type_id: claimed.item_type_id,
      quantity: claimed.quantity,
      acquired_at: attemptedAt,
    });

    await tx.insert(debris_collection_logs).values({
      user_id: String(userId),
      debris_id: String(debrisId),
      result: 'accepted',
      reason: '',
      collected_materials: collectedMaterials,
      found_items: JSON.stringify([{ item_name: item.item_name, quantity: claimed.quantity }]),
      attempted_at: attemptedAt,
    });

    return {
      updatedUser,
      found: [{ item_name: item.item_name, quantity: claimed.quantity }],
      collected: collectedMaterials,
      raft_size: updatedUser.raft_size,
    };
  });
};
