// Validation rules are defined on the route using body() + handleValidationErrors middleware
import { findAllUserItems, findUserItemById, insertUserItem, updateUserItem, removeUserItem } from '../models/userItemModel.js';
import { findUserById } from '../models/userModel.js';
import { findItemTypeById } from '../models/itemTypeModel.js';
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

/** Get all user items. Supports `?user_id=<id>` and `?category=<category>` query params. */
export const getAllUserItems = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.user_id !== undefined) {
      filters.user_id = parsePositiveInt(req.query.user_id, 'user_id');
    }

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
    const userItemId = parsePositiveInt(req.params.user_item_id, 'user_item_id');
    const userItem = await findUserItemById(userItemId);

    if (!userItem) {
      throw new AppError('NOT_FOUND', 'User item not found');
    }

    res.status(200).json(userItem);
  } catch (error) {
    next(error);
  }
};

/** Create a new user item. Validation rules are on the route; results checked here. */
export const createUserItem = async (req, res, next) => {
  try {
    // Check FKs exist before inserting — skipping this causes the DB to throw a raw constraint error (500)
    const user = await findUserById(req.body.user_id);
    if (!user) {
      throw new AppError('NOT_FOUND', `User with id ${req.body.user_id} not found`);
    }

    const itemType = await findItemTypeById(req.body.item_type_id);
    if (!itemType) {
      throw new AppError('NOT_FOUND', `Item type with id ${req.body.item_type_id} not found`);
    }

    const data = {
      // Take the id from the row we just loaded, not from the body — it is already the
      // integer the column expects, whatever JSON type the client sent.
      user_id: user.user_id,
      item_type_id: req.body.item_type_id,
      quantity: req.body.quantity ?? 1,                            // ?? sets a default only when the value is null/undefined (unlike || which also triggers on 0)
      acquired_at: req.body.acquired_at ?? new Date().toISOString(), // default to current timestamp if not provided
    };

    const userItem = await insertUserItem(data);
    res.status(201).json(userItem);
  } catch (error) {
    next(error);
  }
};

/** Update a user item by ID. Accepts `quantity` and/or `acquired_at` in the body. */
export const patchUserItem = async (req, res, next) => {
  try {
    const userItemId = parsePositiveInt(req.params.user_item_id, 'user_item_id');

    // Only include fields that were actually sent — avoids overwriting fields the client didn't touch
    const data = {};
    if (req.body.quantity !== undefined) data.quantity = req.body.quantity;
    if (req.body.acquired_at !== undefined) data.acquired_at = req.body.acquired_at;

    // Reject the request early if nothing was sent — avoids firing a no-op UPDATE against the DB
    if (Object.keys(data).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No fields provided to update');
    }

    const userItem = await updateUserItem(userItemId, data);

    if (!userItem) {
      throw new AppError('NOT_FOUND', 'User item not found');
    }

    res.status(200).json(userItem);
  } catch (error) {
    next(error);
  }
};

/** Delete a user item by ID. Returns 204 on success, 404 if not found. */
export const deleteUserItem = async (req, res, next) => {
  try {
    const userItemId = parsePositiveInt(req.params.user_item_id, 'user_item_id');
    const userItem = await removeUserItem(userItemId);

    if (!userItem) {
      throw new AppError('NOT_FOUND', 'User item not found');
    }

    res.status(204).end(); // 204 No Content — .end() sends the response with no body
  } catch (error) {
    next(error);
  }
};
