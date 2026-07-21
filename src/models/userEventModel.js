import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { user_events } from '../db/schema.js';

export { user_events };

/** Get event history with optional owner and event filters. */
export const findAllUserEvents = async (filters = {}) => {
  const conditions = [];

  if (filters.user_id !== undefined) conditions.push(eq(user_events.user_id, filters.user_id));
  if (filters.event_id !== undefined) conditions.push(eq(user_events.event_id, Number(filters.event_id)));

  if (conditions.length > 0) return await db.select().from(user_events).where(and(...conditions));
  return await db.select().from(user_events);
};

/** Get one event history record by its integer primary key. */
export const findUserEventById = async (id) => {
  const rows = await db.select().from(user_events).where(eq(user_events.user_event_id, Number(id)));
  return rows[0];
};

/** Insert an event history record and return it. */
export const insertUserEvent = async (data) => {
  const rows = await db.insert(user_events).values(data).returning();
  return rows[0];
};

/** Update an event history record by id. */
export const updateUserEvent = async (id, data) => {
  const rows = await db.update(user_events).set(data).where(eq(user_events.user_event_id, Number(id))).returning();
  return rows[0];
};

/** Delete an event history record by id. */
export const removeUserEvent = async (id) => {
  const rows = await db.delete(user_events).where(eq(user_events.user_event_id, Number(id))).returning();
  return rows[0];
};
