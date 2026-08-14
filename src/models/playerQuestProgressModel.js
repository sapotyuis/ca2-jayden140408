import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { quests, user_quests } from '../db/schema.js';

export { user_quests };

/** Get survivor quest records with optional owner, quest, and status filters. */
export const findAllUserQuests = async (filters = {}, executor = db) => {
  const conditions = [];

  if (filters.user_id !== undefined) conditions.push(eq(user_quests.user_id, filters.user_id));
  if (filters.quest_id !== undefined) conditions.push(eq(user_quests.quest_id, Number(filters.quest_id)));
  if (filters.status !== undefined) conditions.push(eq(user_quests.status, filters.status));

  if (conditions.length > 0) return await executor.select().from(user_quests).where(and(...conditions));
  return await executor.select().from(user_quests);
};

/** Get one survivor quest record by its integer primary key. */
export const findUserQuestById = async (id) => {
  const rows = await db.select().from(user_quests).where(eq(user_quests.user_quest_id, Number(id)));
  return rows[0];
};

/** Get one survivor's progress record for a specific quest. Returns undefined if never started. */
export const findUserQuestByUserAndQuest = async (userId, questId, executor = db) => {
  const rows = await executor
    .select()
    .from(user_quests)
    .where(and(eq(user_quests.user_id, Number(userId)), eq(user_quests.quest_id, Number(questId))));
  return rows[0];
};

/** Insert a survivor quest record and return it. */
export const insertUserQuest = async (data, executor = db) => {
  const rows = await executor.insert(user_quests).values(data).returning();
  return rows[0];
};

/** Update a survivor quest record by id. */
export const updateUserQuest = async (id, data, executor = db) => {
  const rows = await executor.update(user_quests).set(data).where(eq(user_quests.user_quest_id, Number(id))).returning();
  return rows[0];
};

/**
 * Advances eligible quests inside the caller's transaction. Keeping this workflow in the
 * user-quest model lets the route middleware call one model operation while still updating
 * the quest catalogue and the survivor's progress atomically.
 */
export const updateQuestProgress = async (user, questType, amount = 1, executor = db) => {
  const questsOfType = await executor
    .select()
    .from(quests)
    .where(and(eq(quests.quest_type, questType), eq(quests.is_active, 1)));
  const eligibleQuests = questsOfType.filter((quest) => user.raft_size >= quest.min_raft_size);
  if (eligibleQuests.length === 0) return [];

  const userQuests = await findAllUserQuests({ user_id: user.user_id }, executor);
  const byQuestId = new Map(userQuests.map((userQuest) => [userQuest.quest_id, userQuest]));
  const justCompleted = [];

  for (const quest of eligibleQuests) {
    let userQuest = byQuestId.get(quest.quest_id);
    if (userQuest && (userQuest.status === 'claimed' || userQuest.status === 'completed')) continue;

    if (!userQuest) {
      userQuest = await insertUserQuest(
        { user_id: user.user_id, quest_id: quest.quest_id, progress: 0, status: 'active' },
        executor
      );
    }

    const progress = Math.min(userQuest.progress + amount, quest.target_value);
    const data = { progress };
    if (progress >= quest.target_value) {
      data.status = 'completed';
      data.completed_at = new Date().toISOString();
    }

    await updateUserQuest(userQuest.user_quest_id, data, executor);
    if (data.status === 'completed') {
      justCompleted.push({ quest_id: quest.quest_id, title: quest.title, progress, target_value: quest.target_value });
    }
  }

  return justCompleted;
};
