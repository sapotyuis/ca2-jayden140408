import { findAllUserEvents, findUserEventById, insertUserEvent, updateUserEvent, removeUserEvent } from '../models/userEventModel.js';
import { findOceanEventById } from '../models/oceanEventModel.js';
import { findItemTypeById } from '../models/itemTypeModel.js';
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

/** Verify that the referenced catalogue event exists. */
export const validateUserEventSource = async (req, res, next) => {
  try {
    const event = await findOceanEventById(req.body.event_id);
    if (!event) throw new AppError('NOT_FOUND', `Ocean event with id ${req.body.event_id} not found`);
    next();
  } catch (error) {
    next(error);
  }
};

/** Check that an optional event reward item exists. */
export const validateUserEventRewardItem = async (req, res, next) => {
  try {
    if (req.body.reward_item_type_id === undefined) return next();

    const itemType = await findItemTypeById(req.body.reward_item_type_id);
    if (!itemType) throw new AppError('NOT_FOUND', `Item type with id ${req.body.reward_item_type_id} not found`);
    next();
  } catch (error) {
    next(error);
  }
};

/** Load and authorize an event-history record for owner-scoped reads and writes. */
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

export const loadUserEventForMutation = loadUserEventForOwner;

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

/** POST /api/user-events — record an event for the authenticated survivor. */
export const createUserEvent = async (req, res, next) => {
  try {
    // user_id is now an integer, and a JSON body may send it as "1" or 1 — compare numerically
    // so a well-formed request is not rejected purely over its JSON type.
    if (Number(req.body.user_id) !== req.user.user_id) {
      throw new AppError('VALIDATION_ERROR', 'user_id must match the authenticated user');
    }

    const data = {
      user_id: req.user.user_id,
      event_id: req.body.event_id,
      outcome: req.body.outcome,
      materials_change: req.body.materials_change ?? 0,
      reward_item_quantity: req.body.reward_item_quantity ?? 0,
    };
    if (req.body.reward_item_type_id !== undefined) data.reward_item_type_id = req.body.reward_item_type_id;
    if (req.body.occurred_at !== undefined) data.occurred_at = req.body.occurred_at;

    const row = await insertUserEvent(data);
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/user-events/:user_event_id — update the owner's event history. */
export const patchUserEvent = async (req, res, next) => {
  try {
    const userEventId = res.locals.userEventId;

    const data = {};
    if (req.body.outcome !== undefined) data.outcome = req.body.outcome;
    if (req.body.materials_change !== undefined) data.materials_change = req.body.materials_change;
    if (req.body.reward_item_type_id !== undefined) data.reward_item_type_id = req.body.reward_item_type_id;
    if (req.body.reward_item_quantity !== undefined) data.reward_item_quantity = req.body.reward_item_quantity;
    if (req.body.occurred_at !== undefined) data.occurred_at = req.body.occurred_at;

    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', 'No fields provided to update');

    const row = await updateUserEvent(userEventId, data);
    res.status(200).json(row);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/user-events/:user_event_id — delete the owner's event history record. */
export const deleteUserEvent = async (req, res, next) => {
  try {
    const userEventId = res.locals.userEventId;

    await removeUserEvent(userEventId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
