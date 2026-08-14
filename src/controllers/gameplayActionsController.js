// Runs the transactional gameplay steps for debris, crafting, raft upgrades, events, and quest rewards.
import { findItemTypeById, findItemTypesByIds } from '../models/itemCatalogModel.js';
import { findAllCraftingRecipes } from '../models/craftingRecipeModel.js';
import { collectDebris as collectDebrisFromWorld } from '../models/debrisModel.js';
import { craftItem as craftItemInInventory, findAllUserItems } from '../models/playerInventoryModel.js';
import { findUserQuestByUserAndQuest, updateQuestProgress } from '../models/playerQuestProgressModel.js';
import { findQuestById } from '../models/questBoardModel.js';
import {
  claimPlayerQuestReward,
  findPlayerUpgradeTypes,
  recordDebrisCollection,
  upgradePlayerRaft,
} from '../models/survivorDirectoryModel.js';
import { findUnexpectedEventById, resolveOceanEvent as resolveOceanEventInDatabase } from '../models/unexpectedEventModel.js';
import { UPGRADE_SPECS } from '../config/gameRules.js';
import { canPurchaseUpgrade } from '../utils/upgradeProgress.js';
import { AppError } from '../utils/_errors.js';
import { PipelineResponse, transactionalPipeline } from '../middlewares/transactionMiddleware.js';

const useStep = (operation) => async (req, res, next) => {
  try {
    await operation(req, res);
    next();
  } catch (error) {
    next(error);
  }
};

const txOf = (res) => res.locals.tx;

// Debris collection -------------------------------------------------------

export const checkDebrisCollection = (req, res, next) => {
  const debrisId = req.params.debris_id || req.body?.debris_id;
  if (!debrisId) return next(new AppError('VALIDATION_ERROR', 'debris_id is required'));

  res.locals.debrisId = String(debrisId);
  res.locals.attemptedAt = new Date().toISOString();
  next();
};

export const collectDebris = useStep(async (req, res) => {
  const result = await collectDebrisFromWorld(
    req.user.user_id,
    res.locals.debrisId,
    res.locals.attemptedAt,
    txOf(res)
  );

  if (!result) {
    throw new PipelineResponse(409, {
      error: { code: 'CONFLICT', message: 'Debris was already collected or is unavailable' },
    });
  }

  res.locals.collection = result;
});

export const updateDebrisQuestProgress = useStep(async (req, res) => {
  res.locals.completedQuests = await updateQuestProgress(
    res.locals.collection.updatedUser,
    'collect_debris',
    1,
    txOf(res)
  );
});

const recordRejectedCollection = async (error, req, res) => {
  try {
    await recordDebrisCollection({
      user_id: req.user?.user_id,
      debris_id: res.locals.debrisId || null,
      result: 'rejected',
      reason: error.message || 'Collection failed',
      collected_materials: 0,
      found_items: '[]',
      attempted_at: res.locals.attemptedAt || new Date().toISOString(),
    });
  } catch (logError) {
    console.error('[GAME] collection audit log write failed', { message: logError.message });
  }
};

export const collectDebrisAction = transactionalPipeline(
  [checkDebrisCollection, collectDebris, updateDebrisQuestProgress],
  { onError: recordRejectedCollection }
);

// Crafting -----------------------------------------------------------------

export const loadCraftingRecipes = useStep(async (req, res) => {
  const resultItemTypeId = Number(req.body.result_item_type_id);
  const recipes = await findAllCraftingRecipes({ result_item_type_id: resultItemTypeId }, txOf(res));
  if (recipes.length === 0) throw new AppError('NOT_FOUND', 'No recipe found for this item');
  res.locals.resultItemTypeId = resultItemTypeId;
  res.locals.recipes = recipes;
});

export const loadCraftedItem = useStep(async (req, res) => {
  const resultItem = await findItemTypeById(res.locals.resultItemTypeId, txOf(res));
  if (!resultItem) throw new AppError('NOT_FOUND', 'Item type not found');
  res.locals.resultItem = resultItem;
});

export const loadPlayerInventoryForCrafting = useStep(async (req, res) => {
  res.locals.userInventory = await findAllUserItems({ user_id: req.user.user_id }, txOf(res));
});

export const loadCraftingIngredients = useStep(async (req, res) => {
  const ingredientIds = res.locals.recipes.map((recipe) => recipe.ingredient_item_type_id);
  const items = await findItemTypesByIds(ingredientIds, txOf(res));
  res.locals.ingredientItems = new Map(items.map((item) => [item.item_type_id, item]));
});

export const checkCraftingIngredients = (req, res, next) => {
  const inventoryMap = {};
  for (const row of res.locals.userInventory) {
    if (!inventoryMap[row.item_type_id]) inventoryMap[row.item_type_id] = { total: 0, rows: [] };
    inventoryMap[row.item_type_id].total += row.quantity;
    inventoryMap[row.item_type_id].rows.push(row);
  }

  const deductions = [];
  for (const recipe of res.locals.recipes) {
    const inventory = inventoryMap[recipe.ingredient_item_type_id];
    const have = inventory ? inventory.total : 0;
    if (have < recipe.quantity_required) {
      const ingredient = res.locals.ingredientItems.get(recipe.ingredient_item_type_id);
      throw new AppError(
        'VALIDATION_ERROR',
        `Not enough ${ingredient?.item_name || 'ingredient'} to craft ${res.locals.resultItem.item_name}. Need ${recipe.quantity_required}, have ${have}.`
      );
    }
    deductions.push({ rows: inventory.rows, required: recipe.quantity_required });
  }

  res.locals.deductions = deductions;
  next();
};

export const saveCraftedItem = useStep(async (req, res) => {
  res.locals.craftedItem = await craftItemInInventory(
    req.user.user_id,
    res.locals.deductions,
    res.locals.resultItemTypeId,
    txOf(res)
  );
});

export const craftItemAction = transactionalPipeline([
  loadCraftingRecipes,
  loadCraftedItem,
  loadPlayerInventoryForCrafting,
  loadCraftingIngredients,
  checkCraftingIngredients,
  saveCraftedItem,
]);

// Raft upgrades ------------------------------------------------------------

export const loadPlayerUpgradeState = useStep(async (req, res) => {
  const upgradeType = req.body.upgrade_type;
  const spec = UPGRADE_SPECS[upgradeType];
  if (!spec) throw new AppError('VALIDATION_ERROR', `Unknown upgrade type: ${upgradeType}`);

  const installedUpgrades = await findPlayerUpgradeTypes(req.user.user_id, txOf(res));
  if (!canPurchaseUpgrade(upgradeType, installedUpgrades)) {
    throw new AppError('VALIDATION_ERROR', `${upgradeType} is already installed and cannot be purchased again.`);
  }
  if (req.user.materials < spec.material_cost) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Not enough materials for a ${upgradeType}. Need ${spec.material_cost}, have ${req.user.materials} — collect more debris first.`
    );
  }

  res.locals.upgradeType = upgradeType;
  res.locals.upgradeSpec = spec;
});

export const savePlayerRaftUpgrade = useStep(async (req, res) => {
  res.locals.upgradeResult = await upgradePlayerRaft(
    req.user.user_id,
    req.user.materials - res.locals.upgradeSpec.material_cost,
    req.user.raft_size + res.locals.upgradeSpec.raft_size_gain,
    {
      user_id: req.user.user_id,
      upgrade_type: res.locals.upgradeType,
      material_cost: res.locals.upgradeSpec.material_cost,
    },
    txOf(res)
  );
});

export const upgradeRaftAction = transactionalPipeline([
  loadPlayerUpgradeState,
  savePlayerRaftUpgrade,
]);

// Unexpected ocean events -------------------------------------------------

export const checkUnexpectedEvent = (req, res, next) => {
  const eventId = Number(req.body.event_id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return next(new AppError('VALIDATION_ERROR', 'event_id must be a positive integer'));
  }
  res.locals.eventId = eventId;
  next();
};

export const loadOceanEvent = useStep(async (req, res) => {
  const event = await findUnexpectedEventById(res.locals.eventId, txOf(res));
  if (!event) throw new AppError('NOT_FOUND', 'Unexpected event not found or inactive');
  res.locals.event = event;
});

export const resolveOceanEvent = useStep(async (req, res) => {
  const result = await resolveOceanEventInDatabase({
    userId: req.user.user_id,
    event: res.locals.event,
    executor: txOf(res),
  });
  if (!result) throw new AppError('NOT_FOUND', 'Survivor not found');

  if (result.cooldownSecondsRemaining > 0) {
    throw new PipelineResponse(429, {
      error: {
        code: 'EVENT_COOLDOWN',
        message: `This event is cooling down. Try again in ${result.cooldownSecondsRemaining} seconds.`,
        seconds_remaining: result.cooldownSecondsRemaining,
      },
    });
  }
  res.locals.eventResult = result;
});

export const updateEventQuestProgress = useStep(async (req, res) => {
  res.locals.completedQuests = await updateQuestProgress(
    res.locals.eventResult.updatedUser,
    'survive_event',
    1,
    txOf(res)
  );
});

export const resolveOceanEventAction = transactionalPipeline([
  checkUnexpectedEvent,
  loadOceanEvent,
  resolveOceanEvent,
  updateEventQuestProgress,
]);

// Quest rewards ------------------------------------------------------------

export const checkQuestReward = (req, res, next) => {
  const questId = Number(req.params.quest_id);
  if (!Number.isInteger(questId) || questId <= 0) {
    return next(new AppError('VALIDATION_ERROR', 'quest_id must be a positive integer'));
  }
  res.locals.questId = questId;
  next();
};

export const loadQuestForReward = useStep(async (req, res) => {
  const quest = await findQuestById(res.locals.questId, txOf(res));
  if (!quest) throw new AppError('NOT_FOUND', 'Quest not found');
  res.locals.quest = quest;
});

export const loadPlayerQuestForReward = useStep(async (req, res) => {
  const userQuest = await findUserQuestByUserAndQuest(req.user.user_id, res.locals.questId, txOf(res));
  if (!userQuest) throw new AppError('NOT_FOUND', "You haven't started this quest yet");
  if (userQuest.status === 'claimed') {
    throw new PipelineResponse(409, {
      error: { code: 'CONFLICT', message: 'This quest reward has already been claimed' },
    });
  }
  if (userQuest.status !== 'completed') {
    throw new AppError(
      'VALIDATION_ERROR',
      `Quest not complete yet (${userQuest.progress}/${res.locals.quest.target_value})`
    );
  }
  res.locals.userQuest = userQuest;
});

export const saveQuestReward = useStep(async (req, res) => {
  res.locals.questReward = await claimPlayerQuestReward({
    userQuestId: res.locals.userQuest.user_quest_id,
    userId: req.user.user_id,
    newMaterials: req.user.materials + res.locals.quest.reward_materials,
    rewardItemTypeId: res.locals.quest.reward_item_type_id,
    rewardItemQuantity: res.locals.quest.reward_item_quantity,
    executor: txOf(res),
  });
});

export const claimQuestRewardAction = transactionalPipeline([
  checkQuestReward,
  loadQuestForReward,
  loadPlayerQuestForReward,
  saveQuestReward,
]);
