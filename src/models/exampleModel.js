// 📋 EXAMPLE FILE — use this as a reference when creating your own model.
// Copy this file, rename it, and adapt the functions for your new table.

/**
 * CRUD query functions for the tasks table.
 * Each function takes a `db` instance and returns plain data (no HTTP objects).
 */

import { eq, like, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { tasks } from '../db/schema.js';

// Re-export the schema so existing imports like `import { tasks } from '...exampleModel.js'` still work
export { tasks };

/** Get all tasks. Supports optional `completed` and `search` filters. */
export const findAllTasks = async (filters = {}) => {
  const conditions = [];

  if (filters.completed !== undefined) {
    conditions.push(eq(tasks.completed, filters.completed));
  }

  if (filters.search) {
    conditions.push(like(tasks.title, `%${filters.search}%`));
  }

  if (conditions.length > 0) {
    return await db.select().from(tasks).where(and(...conditions));
  }

  return await db.select().from(tasks);
};

/** Get a single task by ID. Returns undefined if not found. */
export const findTaskById = async (id) => {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id));
  return rows[0];
};

/** Create a new task. `data.title` is required. */
export const insertTask = async (data) => {
  const rows = await db.insert(tasks).values(data).returning();
  return rows[0];
};

/** Update a task by ID. Returns undefined if not found. */
export const updateTask = async (id, data) => {
  const rows = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
  return rows[0];
};

/** Delete a task by ID. Returns undefined if not found. */
export const removeTask = async (id) => {
  const rows = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  return rows[0];
};
