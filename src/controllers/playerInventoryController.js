// Handles read operations for the player's server-owned inventory and enforces ownership.
// Validation rules are defined on the route using body() + handleValidationErrors middleware
import { findAllUserItems, findUserItemById } from '../models/playerInventoryModel.js';
import { AppError } from '../utils/_errors.js';

// Throws AppError directly on invalid input so the error bubbles up through next(error) to the centralized error handler
/** Parses a route/query param to a positive integer or throws VALIDATION_ERROR. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  // Number('abc') = NaN, Number('1.5') = 1.5 — both fail isInteger; guards against Drizzle crashing with a 500
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
};

/** Get all inventory rows owned by the authenticated survivor; supports `?category=<category>`. */
export const getAllUserItems = async (req, res, next) => {
  try {
    const filters = { user_id: req.user.user_id };

    if (req.query.category !== undefined) {
      filters.category = req.query.category;
    }

    const userItems = await findAllUserItems(filters);
    res.status(200).json(userItems);
  } catch (error) {
    // next(error) passes the error to the centralized errorHandler middleware registered in _errors.js
    next(error);
  }
};

/** Get a single user item by ID. */
export const getUserItemById = async (req, res, next) => {
  try {
    res.status(200).json(res.locals.userItem);
  } catch (error) {
    next(error);
  }
};

/** Load an inventory row and ensure it belongs to the authenticated survivor. */
export const loadUserItemForOwner = async (req, res, next) => {
  try {
    const userItemId = parsePositiveInt(req.params.user_item_id, 'user_item_id');
    const userItem = await findUserItemById(userItemId);
    if (!userItem || Number(userItem.user_id) !== Number(req.user.user_id)) {
      throw new AppError('NOT_FOUND', 'User item not found');
    }

    res.locals.userItem = userItem;
    next();
  } catch (error) {
    next(error);
  }
};
