import { findAllUserQuests, findUserQuestById, insertUserQuest, updateUserQuest, removeUserQuest } from '../models/userQuestModel.js';
import { findQuestById } from '../models/questModel.js';
import { AppError } from '../utils/_errors.js';

/** Parses a route parameter to a positive integer. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
};

/** Prevents an authenticated survivor from mutating another survivor's quest state. */
const requireOwner = (record, userId) => {
  if (!record || record.user_id !== userId) throw new AppError('NOT_FOUND', 'User quest not found');
};

/** Verify that the referenced quest exists before creating a user-quest record. */
export const validateUserQuestSource = async (req, res, next) => {
  try {
    const quest = await findQuestById(req.body.quest_id);
    if (!quest) throw new AppError('NOT_FOUND', `Quest with id ${req.body.quest_id} not found`);
    next();
  } catch (error) {
    next(error);
  }
};

/** Load and authorize a user-quest record for owner-scoped reads and writes. */
export const loadUserQuestForOwner = async (req, res, next) => {
  try {
    const userQuestId = parsePositiveInt(req.params.user_quest_id, 'user_quest_id');
    const existing = await findUserQuestById(userQuestId);
    requireOwner(existing, req.user.user_id);
    res.locals.userQuestId = userQuestId;
    res.locals.userQuest = existing;
    next();
  } catch (error) {
    next(error);
  }
};

export const loadUserQuestForMutation = loadUserQuestForOwner;

/** GET /api/user-quests — list the owner's quest progress with optional quest/status filters. */
export const getAllUserQuests = async (req, res, next) => {
  try {
    const filters = { user_id: req.user.user_id };
    if (req.query.quest_id !== undefined) filters.quest_id = parsePositiveInt(req.query.quest_id, 'quest_id');
    if (req.query.status !== undefined) filters.status = req.query.status;

    const rows = await findAllUserQuests(filters);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

/** GET /api/user-quests/:user_quest_id — get one quest progress record. */
export const getUserQuestById = async (req, res, next) => {
  try {
    res.status(200).json(res.locals.userQuest);
  } catch (error) {
    next(error);
  }
};

/** POST /api/user-quests — assign a quest to the authenticated survivor. */
export const createUserQuest = async (req, res, next) => {
  try {
    // user_id is now an integer, and a JSON body may send it as "1" or 1 — compare numerically
    // so a well-formed request is not rejected purely over its JSON type.
    if (Number(req.body.user_id) !== req.user.user_id) {
      throw new AppError('VALIDATION_ERROR', 'user_id must match the authenticated user');
    }

    const data = {
      user_id: req.user.user_id,
      quest_id: req.body.quest_id,
      progress: req.body.progress ?? 0,
      status: req.body.status ?? 'available',
    };
    if (req.body.assigned_at !== undefined) data.assigned_at = req.body.assigned_at;

    const row = await insertUserQuest(data);
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/user-quests/:user_quest_id — update the owner's quest progress. */
export const patchUserQuest = async (req, res, next) => {
  try {
    const userQuestId = res.locals.userQuestId;

    const data = {};
    if (req.body.progress !== undefined) data.progress = req.body.progress;
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.completed_at !== undefined) data.completed_at = req.body.completed_at;
    if (req.body.claimed_at !== undefined) data.claimed_at = req.body.claimed_at;

    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', 'No fields provided to update');

    const row = await updateUserQuest(userQuestId, data);
    res.status(200).json(row);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/user-quests/:user_quest_id — remove the owner's quest record. */
export const deleteUserQuest = async (req, res, next) => {
  try {
    const userQuestId = res.locals.userQuestId;

    await removeUserQuest(userQuestId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
