// Handles read operations for the player's server-owned quest progress and enforces ownership.
import { findAllUserQuests, findUserQuestById } from '../models/playerQuestProgressModel.js';
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

/** Load and authorize a user-quest record for the authenticated owner's read. */
export const loadUserQuestForOwner = async (req, res, next) => {
  try {
    const userQuestId = parsePositiveInt(req.params.user_quest_id, 'user_quest_id');
    const existing = await findUserQuestById(userQuestId);
    requireOwner(existing, req.user.user_id);
    res.locals.userQuest = existing;
    next();
  } catch (error) {
    next(error);
  }
};

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
