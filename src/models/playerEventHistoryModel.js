import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { user_events } from '../db/schema.js';

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
