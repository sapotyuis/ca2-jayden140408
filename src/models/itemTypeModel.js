import { eq, like, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { item_types } from '../db/schema.js';

export { item_types };

/** Get all item types. Supports optional `category` and `search` (item_name) filters. */
export const findAllItemTypes = async (filters = {}) => {
  const conditions = [];

  if (filters.category !== undefined) {
    conditions.push(eq(item_types.category, filters.category));
  }

  if (filters.search !== undefined) {
    conditions.push(like(item_types.item_name, `%${filters.search}%`));
  }

  if (conditions.length > 0) {
    return await db.select().from(item_types).where(and(...conditions));
  }

  return await db.select().from(item_types);
};

/** Get a single item type by ID. Returns undefined if not found. */
export const findItemTypeById = async (id) => {
  const rows = await db.select().from(item_types).where(eq(item_types.item_type_id, id));
  return rows[0];
};

/** Create a new item type. Returns the inserted row. */
export const insertItemType = async (data) => {
  const rows = await db.insert(item_types).values(data).returning();
  return rows[0];
};

/** Update an item type by ID. Returns undefined if not found. */
export const updateItemType = async (id, data) => {
  const rows = await db.update(item_types).set(data).where(eq(item_types.item_type_id, id)).returning();
  return rows[0];
};

/** Delete an item type by ID. Returns undefined if not found. */
export const removeItemType = async (id) => {
  const rows = await db.delete(item_types).where(eq(item_types.item_type_id, id)).returning();
  return rows[0];
};
