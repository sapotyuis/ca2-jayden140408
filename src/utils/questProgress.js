import { findAllQuests } from '../models/questModel.js';
import { findAllUserQuests, insertUserQuest, updateUserQuest } from '../models/userQuestModel.js';

/**
 * Advances every one of a survivor's quests of a given type by `amount`, called from inside
 * the gameplay actions themselves (collectDebris, craftItem) so quest progress is a side
 * effect of playing rather than something the client has to track and PATCH by hand.
 *
 * A survivor is lazily enrolled in a quest the first time they qualify for it (raft_size
 * requirement met, not already claimed) — there is no separate "accept quest" step. Progress
 * is clamped to target_value, and a quest that reaches it flips to 'completed' so the frontend
 * can prompt the survivor to claim it via POST /api/me/quests/:quest_id/claim.
 *
 * Returns the quests that just newly hit 'completed' from this call, so the caller can surface
 * them in the action's response (e.g. "Quest complete!" alongside the debris haul).
 */
export const advanceQuestProgress = async (user, questType, amount = 1) => {
  const questsOfType = await findAllQuests({ quest_type: questType, is_active: 1 });
  const eligibleQuests = questsOfType.filter((quest) => user.raft_size >= quest.min_raft_size);
  if (eligibleQuests.length === 0) return [];

  const userQuests = await findAllUserQuests({ user_id: user.user_id });
  const byQuestId = new Map(userQuests.map((userQuest) => [userQuest.quest_id, userQuest]));

  const justCompleted = [];

  for (const quest of eligibleQuests) {
    let userQuest = byQuestId.get(quest.quest_id);

    // Claimed or already-completed quests don't progress further — they're done.
    if (userQuest && (userQuest.status === 'claimed' || userQuest.status === 'completed')) continue;

    if (!userQuest) {
      userQuest = await insertUserQuest({ user_id: user.user_id, quest_id: quest.quest_id, progress: 0, status: 'active' });
    }

    const progress = Math.min(userQuest.progress + amount, quest.target_value);
    const data = { progress };
    if (progress >= quest.target_value) {
      data.status = 'completed';
      data.completed_at = new Date().toISOString();
    }

    await updateUserQuest(userQuest.user_quest_id, data);

    if (data.status === 'completed') {
      justCompleted.push({ quest_id: quest.quest_id, title: quest.title, progress, target_value: quest.target_value });
    }
  }

  return justCompleted;
};
