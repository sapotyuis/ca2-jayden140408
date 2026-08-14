// Handles read operations for the player's server-owned ocean-event history and enforces ownership.
import { findAllUserEvents, findUserEventById } from '../models/playerEventHistoryModel.js';
import { AppError } from '../utils/_errors.js';

/** Parses a route parameter to a positive integer. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
};

/** Prevents an authenticated survivor from mutating another survivor's event history. */
const requireOwner = (record, userId) => {
  if (!record || record.user_id !== userId) throw new AppError('NOT_FOUND', 'User event not found');
};

/** Load and authorize an event-history record for the authenticated owner's read. */
export const loadUserEventForOwner = async (req, res, next) => {
  try {
    const userEventId = parsePositiveInt(req.params.user_event_id, 'user_event_id');
    const existing = await findUserEventById(userEventId);
    requireOwner(existing, req.user.user_id);
    res.locals.userEventId = userEventId;
    res.locals.userEvent = existing;
    next();
  } catch (error) {
    next(error);
  }
};

/** GET /api/user-events — list the owner's event history with an optional event filter. */
export const getAllUserEvents = async (req, res, next) => {
  try {
    const filters = { user_id: req.user.user_id };
    if (req.query.event_id !== undefined) filters.event_id = parsePositiveInt(req.query.event_id, 'event_id');

    const rows = await findAllUserEvents(filters);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

/** GET /api/user-events/:user_event_id — get one event history record. */
export const getUserEventById = async (req, res, next) => {
  try {
    res.status(200).json(res.locals.userEvent);
  } catch (error) {
    next(error);
  }
};
