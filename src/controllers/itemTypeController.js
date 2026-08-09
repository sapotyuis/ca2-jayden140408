// Validation rules are defined on the route using body() + handleValidationErrors middleware
import { findAllItemTypes, findItemTypeById, insertItemType, updateItemType, removeItemType } from '../models/itemTypeModel.js';
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

/** Get all item types. Supports `?category=<category>` and `?search=<term>` query params. */
export const getAllItemTypes = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.category !== undefined) {
      filters.category = req.query.category;
    }

    if (req.query.search !== undefined) {
      filters.search = req.query.search;
    }

    const itemTypes = await findAllItemTypes(filters);
    res.status(200).json(itemTypes);
  } catch (error) {
    // next(error) passes the error to the centralized errorHandler middleware registered in _errors.js
    next(error);
  }
};

/** Get a single item type by ID. */
export const getItemTypeById = async (req, res, next) => {
  try {
    const itemTypeId = parsePositiveInt(req.params.item_type_id, 'item_type_id');
    const itemType = await findItemTypeById(itemTypeId);

    if (!itemType) {
      throw new AppError('NOT_FOUND', 'Item type not found');
    }

    res.status(200).json(itemType);
  } catch (error) {
    next(error);
  }
};

/** Create a new item type. Validation rules are on the route; results checked here. */
export const createItemType = async (req, res, next) => {
  try {
    const data = {
      item_name: req.body.item_name,
      category: req.body.category,
      material_cost: req.body.material_cost,
      raft_points: req.body.raft_points,
    };

    const itemType = await insertItemType(data);
    res.status(201).json(itemType);
  } catch (error) {
    next(error);
  }
};

/** Update an item type by ID. Accepts any combination of fields in the body. */
export const patchItemType = async (req, res, next) => {
  try {
    const itemTypeId = parsePositiveInt(req.params.item_type_id, 'item_type_id');

    // Only include fields that were actually sent — avoids overwriting fields the client didn't touch
    const data = {};
    if (req.body.item_name !== undefined) data.item_name = req.body.item_name;
    if (req.body.category !== undefined) data.category = req.body.category;
    if (req.body.material_cost !== undefined) data.material_cost = req.body.material_cost;
    if (req.body.raft_points !== undefined) data.raft_points = req.body.raft_points;

    // Reject the request early if nothing was sent — avoids firing a no-op UPDATE against the DB
    if (Object.keys(data).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No fields provided to update');
    }

    const itemType = await updateItemType(itemTypeId, data);

    if (!itemType) {
      throw new AppError('NOT_FOUND', 'Item type not found');
    }

    res.status(200).json(itemType);
  } catch (error) {
    next(error);
  }
};

/** Delete an item type by ID. Returns 204 on success, 404 if not found. */
export const deleteItemType = async (req, res, next) => {
  try {
    const itemTypeId = parsePositiveInt(req.params.item_type_id, 'item_type_id');
    const itemType = await removeItemType(itemTypeId);

    if (!itemType) {
      throw new AppError('NOT_FOUND', 'Item type not found');
    }

    res.status(204).end(); // 204 No Content — .end() sends the response with no body
  } catch (error) {
    next(error);
  }
};
