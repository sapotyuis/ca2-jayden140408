// Handles read operations for the server-owned item catalogue.
// Validation rules are defined on the route using body() + handleValidationErrors middleware
import { findAllItemTypes, findItemTypeById } from '../models/itemCatalogModel.js';
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
