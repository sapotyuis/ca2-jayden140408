import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { quests, user_quests } from '../db/schema.js';

export { quests };

/** Get all quests with optional type and active-state filters. */
export const findAllQuests = async (filters = {}, executor = db) => {
  const conditions = [];

  if (filters.quest_type !== undefined) conditions.push(eq(quests.quest_type, filters.quest_type));
  if (filters.is_active !== undefined) conditions.push(eq(quests.is_active, filters.is_active));

  if (conditions.length > 0) return await executor.select().from(quests).where(and(...conditions));
  return await executor.select().from(quests);
};

/** Get one quest by its integer primary key. */
export const findQuestById = async (id, executor = db) => {
  const rows = await executor.select().from(quests).where(eq(quests.quest_id, Number(id)));
  return rows[0];
};

/**
 * The active quest catalogue merged with one survivor's progress on each — the "quest board"
 * the frontend renders. A left join keeps quests the survivor hasn't started yet in the list
 * (progress/status/user_quest_id come back null) instead of only showing ones already begun.
 */
export const findPlayerQuestBoard = async (userId) => {
  return await db
    .select({
      quest_id: quests.quest_id,
      title: quests.title,
      description: quests.description,
      quest_type: quests.quest_type,
      target_value: quests.target_value,
      reward_materials: quests.reward_materials,
      reward_item_type_id: quests.reward_item_type_id,
      reward_item_quantity: quests.reward_item_quantity,
      min_raft_size: quests.min_raft_size,
      user_quest_id: user_quests.user_quest_id,
      progress: user_quests.progress,
      status: user_quests.status,
      completed_at: user_quests.completed_at,
      claimed_at: user_quests.claimed_at,
    })
    .from(quests)
    .leftJoin(user_quests, and(eq(user_quests.quest_id, quests.quest_id), eq(user_quests.user_id, Number(userId))))
    .where(eq(quests.is_active, 1));
};
