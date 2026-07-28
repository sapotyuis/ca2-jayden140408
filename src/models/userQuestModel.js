import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { user_quests } from '../db/schema.js';

export { user_quests };

/** Get survivor quest records with optional owner, quest, and status filters. */
export const findAllUserQuests = async (filters = {}) => {
  const conditions = [];

  if (filters.user_id !== undefined) conditions.push(eq(user_quests.user_id, filters.user_id));
  if (filters.quest_id !== undefined) conditions.push(eq(user_quests.quest_id, Number(filters.quest_id)));
  if (filters.status !== undefined) conditions.push(eq(user_quests.status, filters.status));

  if (conditions.length > 0) return await db.select().from(user_quests).where(and(...conditions));
  return await db.select().from(user_quests);
};

/** Get one survivor quest record by its integer primary key. */
export const findUserQuestById = async (id) => {
  const rows = await db.select().from(user_quests).where(eq(user_quests.user_quest_id, Number(id)));
  return rows[0];
};

/** Get one survivor's progress record for a specific quest. Returns undefined if never started. */
export const findUserQuestByUserAndQuest = async (userId, questId) => {
  const rows = await db
    .select()
    .from(user_quests)
    .where(and(eq(user_quests.user_id, String(userId)), eq(user_quests.quest_id, Number(questId))));
  return rows[0];
};

/** Insert a survivor quest record and return it. */
export const insertUserQuest = async (data) => {
  const rows = await db.insert(user_quests).values(data).returning();
  return rows[0];
};

/** Update a survivor quest record by id. */
export const updateUserQuest = async (id, data) => {
  const rows = await db.update(user_quests).set(data).where(eq(user_quests.user_quest_id, Number(id))).returning();
  return rows[0];
};

/** Delete a survivor quest record by id. */
export const removeUserQuest = async (id) => {
  const rows = await db.delete(user_quests).where(eq(user_quests.user_quest_id, Number(id))).returning();
  return rows[0];
};
