// Handles read operations for the server-owned quest board.
import { findAllQuests, findQuestById } from '../models/questBoardModel.js';
import { AppError } from '../utils/_errors.js';

/** Parses a route parameter to a positive integer or throws a structured validation error. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
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
