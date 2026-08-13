import { findAllQuests, findQuestById, insertQuest, updateQuest, removeQuest } from '../models/questModel.js';
import { findItemTypeById } from '../models/itemTypeModel.js';
import { AppError } from '../utils/_errors.js';

/** Parses a route parameter to a positive integer or throws a structured validation error. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
};

/** Checks that an optional reward item exists before a quest is written. */
export const validateQuestRewardItem = async (req, res, next) => {
  try {
    if (req.body.reward_item_type_id === undefined) return next();

    const itemType = await findItemTypeById(req.body.reward_item_type_id);
    if (!itemType) throw new AppError('NOT_FOUND', `Item type with id ${req.body.reward_item_type_id} not found`);
    next();
  } catch (error) {
    next(error);
  }
};

/** GET /api/quests — list quests, optionally filtered by quest type. */
export const getAllQuests = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.quest_type !== undefined) filters.quest_type = req.query.quest_type;

    const rows = await findAllQuests(filters);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

/** GET /api/quests/:quest_id — get one quest. */
export const getQuestById = async (req, res, next) => {
  try {
    const questId = parsePositiveInt(req.params.quest_id, 'quest_id');
    const quest = await findQuestById(questId);
    if (!quest) throw new AppError('NOT_FOUND', 'Quest not found');

    res.status(200).json(quest);
  } catch (error) {
    next(error);
  }
};

/** POST /api/quests — create a quest after route validation and reward FK validation. */
export const createQuest = async (req, res, next) => {
  try {
    const data = {
      title: req.body.title,
      description: req.body.description,
      quest_type: req.body.quest_type,
      target_value: req.body.target_value ?? 1,
      reward_materials: req.body.reward_materials ?? 0,
      reward_item_quantity: req.body.reward_item_quantity ?? 0,
      min_raft_size: req.body.min_raft_size ?? 1,
      is_active: req.body.is_active ?? 1,
    };
    if (req.body.reward_item_type_id !== undefined) data.reward_item_type_id = req.body.reward_item_type_id;

    const quest = await insertQuest(data);
    res.status(201).json(quest);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/quests/:quest_id — update only the fields sent by the caller. */
export const patchQuest = async (req, res, next) => {
  try {
    const questId = parsePositiveInt(req.params.quest_id, 'quest_id');
    const data = {};

    if (req.body.reward_item_type_id !== undefined) {
      data.reward_item_type_id = req.body.reward_item_type_id;
    }
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.quest_type !== undefined) data.quest_type = req.body.quest_type;
    if (req.body.target_value !== undefined) data.target_value = req.body.target_value;
    if (req.body.reward_materials !== undefined) data.reward_materials = req.body.reward_materials;
    if (req.body.reward_item_quantity !== undefined) data.reward_item_quantity = req.body.reward_item_quantity;
    if (req.body.min_raft_size !== undefined) data.min_raft_size = req.body.min_raft_size;
    if (req.body.is_active !== undefined) data.is_active = req.body.is_active;

    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', 'No fields provided to update');

    const quest = await updateQuest(questId, data);
    if (!quest) throw new AppError('NOT_FOUND', 'Quest not found');

    res.status(200).json(quest);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/quests/:quest_id — delete a quest. */
export const deleteQuest = async (req, res, next) => {
  try {
    const questId = parsePositiveInt(req.params.quest_id, 'quest_id');
    const quest = await removeQuest(questId);
    if (!quest) throw new AppError('NOT_FOUND', 'Quest not found');

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
