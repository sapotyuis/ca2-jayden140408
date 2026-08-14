import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { ocean_events } from '../db/schema.js';

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
