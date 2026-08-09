import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { user_items, item_types } from '../db/schema.js';

export { user_items };

// Shared column selection — joins item_types so callers get full item details in one query
const itemDetail = {
  user_item_id: user_items.user_item_id,
  user_id: user_items.user_id,
  item_type_id: user_items.item_type_id,
  quantity: user_items.quantity,
  acquired_at: user_items.acquired_at,
  item_name: item_types.item_name,
  category: item_types.category,
  material_cost: item_types.material_cost,
  raft_points: item_types.raft_points,
};

/** Get all user items with item details. Supports optional `user_id` and `category` filters. */
export const findAllUserItems = async (filters = {}, executor = db) => {
  const conditions = [];

  if (filters.user_id !== undefined) {
    conditions.push(eq(user_items.user_id, filters.user_id));
  }

  if (filters.category !== undefined) {
    conditions.push(eq(item_types.category, filters.category));
  }

  const query = executor
    .select(itemDetail)
    .from(user_items)
    .innerJoin(item_types, eq(user_items.item_type_id, item_types.item_type_id));

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
};

/** Get a single user item by ID with item details. Returns undefined if not found. */
export const findUserItemById = async (id) => {
  const rows = await db
    .select(itemDetail)
    .from(user_items)
    .innerJoin(item_types, eq(user_items.item_type_id, item_types.item_type_id))
    .where(eq(user_items.user_item_id, id));
  return rows[0];
};

/** Create a new user item. Returns the inserted row. */
export const insertUserItem = async (data) => {
  const rows = await db.insert(user_items).values(data).returning();
  return rows[0];
};

/** Update a user item by ID. Returns undefined if not found. */
export const updateUserItem = async (id, data) => {
  const rows = await db.update(user_items).set(data).where(eq(user_items.user_item_id, id)).returning();
  return rows[0];
};

/** Delete a user item by ID. Returns undefined if not found. */
export const removeUserItem = async (id) => {
  const rows = await db.delete(user_items).where(eq(user_items.user_item_id, id)).returning();
  return rows[0];
};

/**
 * Atomically deducts ingredient quantities and inserts the crafted result.
 * Deductions work across multiple rows for the same item_type (FIFO).
 * All writes succeed or all roll back.
 */
export const craftItemAtomic = async (userId, deductions, resultItemTypeId, executor = db) => {
  const operation = async (tx) => {

    // Loop through each ingredient that needs to be deducted (e.g. Wood Plank ×2)
    for (const { rows, required } of deductions) {
      let toDeduct = required; // how many still need to be removed

      // Loop through each inventory row for this ingredient (user may have it spread across multiple rows)
      for (const row of rows) {
        if (toDeduct <= 0) break; // already deducted enough, stop early

        // Take as much as possible from this row without going negative
        const take = Math.min(row.quantity, toDeduct);
        toDeduct -= take; // reduce how many still need to be deducted
        const remaining = row.quantity - take; // what's left in this row after deduction

        if (remaining <= 0) {
          // Row is now empty — delete it entirely from inventory
          await tx.delete(user_items).where(eq(user_items.user_item_id, row.user_item_id));
        } else {
          // Row still has some left — just update the quantity
          await tx.update(user_items).set({ quantity: remaining }).where(eq(user_items.user_item_id, row.user_item_id));
        }
      }
    }

    // All ingredients deducted — now insert the crafted item into the user's inventory
    const [crafted] = await tx
      .insert(user_items)
      .values({ user_id: userId, item_type_id: resultItemTypeId, quantity: 1, acquired_at: new Date().toISOString() })
      .returning();

    return crafted; // return the newly crafted item row
  };

  return executor === db ? db.transaction(operation) : operation(executor);
};
