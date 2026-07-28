/**
 * Controller for /api/me — every action the logged-in survivor performs on their OWN raft.
 *
 * These handlers never read a user id from the URL or the request body. The survivor is
 * always `req.user`, loaded by loadCurrentUser from the verified JWT. That is what makes it
 * impossible for one player to collect debris on, upgrade, or delete another player's raft.
 */
import { findUserByUsername, updateUser, removeUser, upgradeRaftAtomic, findUserUpgradeTypes, insertDebrisCollectionLog, findDebrisCollectionLogs, claimQuestRewardAtomic } from '../models/userModel.js';
import { ensureActiveDebris, collectDebrisByIdAtomic } from '../models/debrisModel.js';
import { findAllUserItems, craftItemAtomic } from '../models/userItemModel.js';
import { findItemTypeById } from '../models/itemTypeModel.js';
import { findAllCraftingRecipes } from '../models/craftingRecipeModel.js';
import { findAllRaftUpgrades } from '../models/raftUpgradeModel.js';
import { findUnexpectedEvents, findUnexpectedEventById, resolveUnexpectedEventAtomic } from '../models/unexpectedEventModel.js';
import { findQuestBoardForUser, findQuestById } from '../models/questModel.js';
import { findUserQuestByUserAndQuest } from '../models/userQuestModel.js';
import { advanceQuestProgress } from '../utils/questProgress.js';
import { UPGRADE_SPECS, VALID_UPGRADE_TYPES } from '../config/gameRules.js';
import { AppError } from '../utils/_errors.js';

/** GET /api/me — the logged-in survivor's own profile. */
export const getMyProfile = async (req, res) => {
  res.status(200).json(req.user);
};

/**
 * PATCH /api/me — rename the survivor, or set hunger.
 *
 * user_id is deliberately NOT recomputed when the username changes. A primary key that
 * moves would have to cascade across every child table and would silently invalidate the
 * user's JWT (which carries the old id), logging them out mid-session. The id is assigned
 * once at registration and is immutable from then on.
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    // Progression stats (materials, raft_size) are intentionally not editable here —
    // they may only change by playing the game via the action routes below.
    const data = {};
    if (req.body.username !== undefined) data.username = req.body.username;
    if (req.body.hunger !== undefined) data.hunger = req.body.hunger;

    // Reject an empty body early rather than firing a no-op UPDATE at the database.
    if (Object.keys(data).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No fields provided to update');
    }

    if (data.username !== undefined) {
      const conflict = await findUserByUsername(data.username);
      // Comparing user_id lets a user re-submit their current username without a false 409.
      if (conflict && conflict.user_id !== req.user.user_id) {
        return res.status(409).json({
          error: { code: 'CONFLICT', message: `Username "${data.username}" is already taken` },
        });
      }
    }

    const user = await updateUser(req.user.user_id, data);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/me — the survivor abandons the raft. 204 No Content on success. */
export const deleteMyAccount = async (req, res, next) => {
  try {
    await removeUser(req.user.user_id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/inventory — everything currently in the survivor's hold. */
export const getMyInventory = async (req, res, next) => {
  try {
    const filters = { user_id: req.user.user_id };
    if (req.query.category) filters.category = req.query.category;

    const items = await findAllUserItems(filters);
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/upgrades — the survivor's raft upgrade history. */
export const getMyUpgrades = async (req, res, next) => {
  try {
    const upgrades = await findAllRaftUpgrades({ user_id: req.user.user_id });
    res.status(200).json(upgrades);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/me/status — the survivor's full progression state in a single call.
 * The frontend uses this to paint the whole game view without fanning out to several routes.
 */
export const getMyStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const upgradeTypes = await findUserUpgradeTypes(user.user_id);

    // Recommend the first upgrade in the standard progression order the user has not bought yet.
    const nextUpgrade = VALID_UPGRADE_TYPES.find((u) => !upgradeTypes.includes(u)) || null;
    const nextSpec = nextUpgrade ? UPGRADE_SPECS[nextUpgrade] : null;

    res.status(200).json({
      user: user.username,
      raft_size: user.raft_size,
      materials: user.materials,
      hunger: user.hunger,
      upgrades: upgradeTypes,
      next_recommended_upgrade: nextUpgrade,
      can_upgrade: nextSpec ? user.materials >= nextSpec.material_cost : false,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/collection-logs — return recent debris attempts with elapsed time between them. */
export const getMyCollectionLogs = async (req, res, next) => {
  try {
    const rows = await findDebrisCollectionLogs(req.user.user_id, 50);
    const chronological = [...rows].reverse();
    const logs = chronological.map((row, index) => {
      const previous = chronological[index - 1];
      const previousTime = previous ? Date.parse(previous.attempted_at) : NaN;
      const currentTime = Date.parse(row.attempted_at);
      const intervalSeconds = Number.isFinite(previousTime) && Number.isFinite(currentTime)
        ? Math.max(0, (currentTime - previousTime) / 1000)
        : null;

      let foundItems = [];
      try {
        foundItems = JSON.parse(row.found_items || '[]');
      } catch (error) {
        foundItems = [];
      }

      return { ...row, found_items: foundItems, seconds_since_previous: intervalSeconds };
    });

    res.status(200).json(logs.reverse());
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/debris — return the current survivor's server-owned floating debris. */
export const getMyDebris = async (req, res, next) => {
  try {
    const activeDebris = await ensureActiveDebris(req.user.user_id);
    res.status(200).json(activeDebris);
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/unexpected-events — return the server-authored event catalogue for the HUD. */
export const getMyUnexpectedEvents = async (req, res, next) => {
  try {
    const events = await findUnexpectedEvents();
    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
};

/** POST /api/me/unexpected-events/resolve — resolve one server-authored event by event_id. */
export const resolveMyUnexpectedEvent = async (req, res, next) => {
  try {
    const eventId = Number(req.body.event_id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      throw new AppError('VALIDATION_ERROR', 'event_id must be a positive integer');
    }

    const event = await findUnexpectedEventById(eventId);
    if (!event) throw new AppError('NOT_FOUND', 'Unexpected event not found or inactive');

    const result = await resolveUnexpectedEventAtomic({ userId: req.user.user_id, event });
    if (!result) throw new AppError('NOT_FOUND', 'Survivor not found');

    if (result.cooldownSecondsRemaining > 0) {
      return res.status(429).json({
        error: {
          code: 'EVENT_COOLDOWN',
          message: `This event is cooling down. Try again in ${result.cooldownSecondsRemaining} seconds.`,
          seconds_remaining: result.cooldownSecondsRemaining,
        },
      });
    }

    const completedQuests = await advanceQuestProgress(result.updatedUser, 'survive_event', 1);
    const response = {
      message: result.outcome.message,
      event: {
        event_id: event.event_id,
        event_name: event.event_name,
        event_type: event.event_type,
        description: event.description,
      },
      outcome: result.outcome.outcome,
      prevented: result.outcome.prevented,
      protection_upgrade_type: result.outcome.protectionUpgradeType,
      lost_item: result.outcome.lostItemQuantity > 0
        ? {
          item_type_id: result.outcome.lostItemTypeId,
          item_name: result.lostItemName,
          quantity: result.outcome.lostItemQuantity,
        }
        : null,
      hunger_change: result.outcome.hungerChange,
      user: result.updatedUser,
      event_history: result.eventHistory,
    };
    if (completedQuests.length > 0) response.completed_quests = completedQuests;

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

const recordRejectedCollection = async (userId, debrisId, reason, attemptedAt) => {
  try {
    await insertDebrisCollectionLog({
      user_id: userId,
      debris_id: debrisId || null,
      result: 'rejected',
      reason,
      collected_materials: 0,
      found_items: '[]',
      attempted_at: attemptedAt,
    });
  } catch (logError) {
    console.log('collection audit log write failed', logError);
  }
};

/** POST /api/me/debris/:debris_id/collect — claim one server-owned debris row. */
export const collectDebris = async (req, res, next) => {
  const attemptedAt = new Date().toISOString();
  const userId = req.user?.user_id;
  const debrisId = req.params.debris_id || req.body?.debris_id;
  let collectionCommitted = false;

  if (!debrisId) {
    await recordRejectedCollection(userId, null, 'debris_id is required', attemptedAt);
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'debris_id is required' } });
  }

  try {
    const result = await collectDebrisByIdAtomic(userId, String(debrisId), attemptedAt);
    if (!result) {
      await recordRejectedCollection(userId, String(debrisId), 'Debris was already collected or does not belong to this survivor', attemptedAt);
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Debris was already collected or is unavailable' } });
    }
    collectionCommitted = true;

    const completedQuests = await advanceQuestProgress(result.updatedUser, 'collect_debris', 1);
    const response = {
      message: 'You collected server-confirmed debris.',
      found: result.found,
      collected: result.collected,
      new_materials: result.updatedUser.materials,
      raft_size: result.raft_size,
    };
    if (completedQuests.length > 0) response.completed_quests = completedQuests;

    res.status(200).json(response);
  } catch (error) {
    if (!collectionCommitted && userId) {
      await recordRejectedCollection(userId, String(debrisId), error.message || 'Collection failed', attemptedAt);
    }
    next(error);
  }
};

/**
 * POST /api/me/upgrade-raft — spend materials to grow the raft.
 * The balance check happens here; the deduction, the raft_size increase, and the upgrade
 * record are written together in one transaction so a failure cannot leave a half-applied upgrade.
 */
export const performRaftUpgrade = async (req, res, next) => {
  try {
    const user = req.user;
    const spec = UPGRADE_SPECS[req.body.upgrade_type];

    if (user.materials < spec.material_cost) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Not enough materials for a ${req.body.upgrade_type}. Need ${spec.material_cost}, have ${user.materials} — collect more debris first.`
      );
    }

    // New values are computed here so the model layer stays free of game rules.
    const { updatedUser, upgrade } = await upgradeRaftAtomic(
      user.user_id,
      user.materials - spec.material_cost,
      user.raft_size + spec.raft_size_gain,
      { user_id: user.user_id, upgrade_type: req.body.upgrade_type, material_cost: spec.material_cost }
    );

    res.status(200).json({
      message: `Raft upgraded with ${req.body.upgrade_type}!`,
      upgrade,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/me/craft — turn inventory ingredients into a crafted item.
 * Every ingredient is validated against the recipe BEFORE anything is written, then the
 * deduction and the new item are committed in one transaction — so a recipe the survivor
 * cannot fully afford consumes nothing at all.
 */
export const craftItem = async (req, res, next) => {
  try {
    const user = req.user;
    const resultItemTypeId = req.body.result_item_type_id;

    const recipes = await findAllCraftingRecipes({ result_item_type_id: resultItemTypeId });
    if (recipes.length === 0) throw new AppError('NOT_FOUND', 'No recipe found for this item');

    const resultItem = await findItemTypeById(resultItemTypeId);
    if (!resultItem) throw new AppError('NOT_FOUND', 'Item type not found');

    // A survivor can hold the same item across several rows, so totals are aggregated by
    // item_type_id before being compared against what the recipe demands.
    const userInventory = await findAllUserItems({ user_id: user.user_id });
    const inventoryMap = {};
    for (const row of userInventory) {
      if (!inventoryMap[row.item_type_id]) inventoryMap[row.item_type_id] = { total: 0, rows: [] };
      inventoryMap[row.item_type_id].total += row.quantity;
      inventoryMap[row.item_type_id].rows.push(row);
    }

    const deductions = [];
    for (const recipe of recipes) {
      const inv = inventoryMap[recipe.ingredient_item_type_id];
      const have = inv ? inv.total : 0;
      if (have < recipe.quantity_required) {
        const ingredientItem = await findItemTypeById(recipe.ingredient_item_type_id);
        throw new AppError(
          'VALIDATION_ERROR',
          `Not enough ${ingredientItem?.item_name || 'ingredient'} to craft ${resultItem.item_name}. Need ${recipe.quantity_required}, have ${have}.`
        );
      }
      deductions.push({ rows: inv.rows, required: recipe.quantity_required });
    }

    const crafted = await craftItemAtomic(user.user_id, deductions, resultItemTypeId);

    // Core Mechanic 2 hook: crafting a food item is what 'craft_food' quests are tracking —
    // other categories (equipment, materials) don't touch the quest board.
    const completedQuests =
      resultItem.category === 'food' ? await advanceQuestProgress(user, 'craft_food', 1) : [];

    const response = {
      message: `Successfully crafted ${resultItem.item_name}!`,
      crafted: {
        item_name: resultItem.item_name,
        category: resultItem.category,
        user_item_id: crafted.user_item_id,
        quantity: crafted.quantity,
      },
    };
    if (completedQuests.length > 0) response.completed_quests = completedQuests;

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/me/quests — the survivor's quest board: every active quest, with this survivor's
 * progress merged in (null fields for a quest they haven't triggered yet via gameplay).
 */
export const getMyQuests = async (req, res, next) => {
  try {
    const board = await findQuestBoardForUser(req.user.user_id);
    res.status(200).json(board);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/me/quests/:quest_id/claim — pay out a completed quest's reward.
 *
 * Progress itself is never edited here — that only ever happens as a side effect of
 * collectDebris/craftItem via advanceQuestProgress. This route just turns an already-earned
 * 'completed' status into materials/items in hand and locks the row as 'claimed'.
 */
export const claimMyQuestReward = async (req, res, next) => {
  try {
    const questId = Number(req.params.quest_id);
    if (!Number.isInteger(questId) || questId <= 0) {
      throw new AppError('VALIDATION_ERROR', 'quest_id must be a positive integer');
    }

    const quest = await findQuestById(questId);
    if (!quest) throw new AppError('NOT_FOUND', 'Quest not found');

    const userQuest = await findUserQuestByUserAndQuest(req.user.user_id, questId);
    if (!userQuest) throw new AppError('NOT_FOUND', "You haven't started this quest yet");
    // A second claim attempt on the same quest is a conflicting state, not bad input —
    // matches the 409 CONFLICT shape already used for username conflicts in this file.
    if (userQuest.status === 'claimed') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'This quest reward has already been claimed' },
      });
    }
    if (userQuest.status !== 'completed') {
      throw new AppError(
        'VALIDATION_ERROR',
        `Quest not complete yet (${userQuest.progress}/${quest.target_value})`
      );
    }

    const { updatedUser, grantedItem } = await claimQuestRewardAtomic({
      userQuestId: userQuest.user_quest_id,
      userId: req.user.user_id,
      newMaterials: req.user.materials + quest.reward_materials,
      rewardItemTypeId: quest.reward_item_type_id,
      rewardItemQuantity: quest.reward_item_quantity,
    });

    res.status(200).json({
      message: `Claimed reward for "${quest.title}"!`,
      materials_gained: quest.reward_materials,
      item_gained: grantedItem,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
