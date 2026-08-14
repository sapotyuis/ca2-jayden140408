import { eq, like, and, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { item_types } from '../db/schema.js';

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
export const findItemTypeById = async (id, executor = db) => {
  const rows = await executor.select().from(item_types).where(eq(item_types.item_type_id, id));
  return rows[0];
};

/** Get several item types in one model operation, preserving the caller's requested IDs. */
export const findItemTypesByIds = async (ids, executor = db) => {
  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id)))];
  if (uniqueIds.length === 0) return [];
  return await executor.select().from(item_types).where(inArray(item_types.item_type_id, uniqueIds));
};
