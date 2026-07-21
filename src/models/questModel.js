import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { quests } from '../db/schema.js';

export { quests };

/** Get all quests with optional type and active-state filters. */
export const findAllQuests = async (filters = {}) => {
  const conditions = [];

  if (filters.quest_type !== undefined) conditions.push(eq(quests.quest_type, filters.quest_type));
  if (filters.is_active !== undefined) conditions.push(eq(quests.is_active, filters.is_active));

  if (conditions.length > 0) return await db.select().from(quests).where(and(...conditions));
  return await db.select().from(quests);
};

/** Get one quest by its integer primary key. */
export const findQuestById = async (id) => {
  const rows = await db.select().from(quests).where(eq(quests.quest_id, Number(id)));
  return rows[0];
};

/** Insert a quest and return the created row. */
export const insertQuest = async (data) => {
  const rows = await db.insert(quests).values(data).returning();
  return rows[0];
};

/** Update a quest by id and return undefined when it does not exist. */
export const updateQuest = async (id, data) => {
  const rows = await db.update(quests).set(data).where(eq(quests.quest_id, Number(id))).returning();
  return rows[0];
};

/** Delete a quest by id and return the deleted row when it exists. */
export const removeQuest = async (id) => {
  const rows = await db.delete(quests).where(eq(quests.quest_id, Number(id))).returning();
  return rows[0];
};
