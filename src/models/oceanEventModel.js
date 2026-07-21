import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { ocean_events } from '../db/schema.js';

export { ocean_events };

/** Get ocean events with optional type and active-state filters. */
export const findAllOceanEvents = async (filters = {}) => {
  const conditions = [];

  if (filters.event_type !== undefined) conditions.push(eq(ocean_events.event_type, filters.event_type));
  if (filters.is_active !== undefined) conditions.push(eq(ocean_events.is_active, filters.is_active));

  if (conditions.length > 0) return await db.select().from(ocean_events).where(and(...conditions));
  return await db.select().from(ocean_events);
};

/** Get one ocean event by its integer primary key. */
export const findOceanEventById = async (id) => {
  const rows = await db.select().from(ocean_events).where(eq(ocean_events.event_id, Number(id)));
  return rows[0];
};

/** Insert an ocean event and return the created row. */
export const insertOceanEvent = async (data) => {
  const rows = await db.insert(ocean_events).values(data).returning();
  return rows[0];
};

/** Update an ocean event by id. */
export const updateOceanEvent = async (id, data) => {
  const rows = await db.update(ocean_events).set(data).where(eq(ocean_events.event_id, Number(id))).returning();
  return rows[0];
};

/** Delete an ocean event by id. */
export const removeOceanEvent = async (id) => {
  const rows = await db.delete(ocean_events).where(eq(ocean_events.event_id, Number(id))).returning();
  return rows[0];
};
