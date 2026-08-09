// Validation rules are defined on the route using body() + handleValidationErrors middleware
import { findAllRaftUpgrades, findRaftUpgradeById, insertRaftUpgrade, updateRaftUpgrade, removeRaftUpgrade } from '../models/raftUpgradeModel.js';
import { findUserById } from '../models/userModel.js';
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

/** Get all raft upgrades. Supports `?user_id=` and `?upgrade_type=` query params. */
export const getAllRaftUpgrades = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.user_id !== undefined) {
      filters.user_id = parsePositiveInt(req.query.user_id, 'user_id');
    }

    if (req.query.upgrade_type !== undefined) {
      filters.upgrade_type = req.query.upgrade_type;
    }

    const upgrades = await findAllRaftUpgrades(filters);
    res.status(200).json(upgrades);
  } catch (error) {
    // next(error) passes the error to the centralized errorHandler middleware registered in _errors.js
    next(error);
  }
};

/** Get a single raft upgrade by ID. */
export const getRaftUpgradeById = async (req, res, next) => {
  try {
    const upgradeId = parsePositiveInt(req.params.upgrade_id, 'upgrade_id');
    const upgrade = await findRaftUpgradeById(upgradeId);

    if (!upgrade) {
      throw new AppError('NOT_FOUND', 'Raft upgrade not found');
    }

    res.status(200).json(upgrade);
  } catch (error) {
    next(error);
  }
};

/** Create a new raft upgrade. Validation rules are on the route; results checked here. */
export const createRaftUpgrade = async (req, res, next) => {
  try {
    // Check FK exists before inserting — skipping this causes the DB to throw a raw constraint error (500)
    const user = await findUserById(req.body.user_id);
    if (!user) {
      throw new AppError('NOT_FOUND', `User with id ${req.body.user_id} not found`);
    }

    const data = {
      // Take the id from the row we just loaded, not from the body — it is already the
      // integer the column expects, whatever JSON type the client sent.
      user_id: user.user_id,
      upgrade_type: req.body.upgrade_type,
      material_cost: req.body.material_cost,
    };

    const upgrade = await insertRaftUpgrade(data);
    res.status(201).json(upgrade);
  } catch (error) {
    next(error);
  }
};

/** Update a raft upgrade by ID. Accepts `upgrade_type` and `material_cost` in the body. */
export const patchRaftUpgrade = async (req, res, next) => {
  try {
    const upgradeId = parsePositiveInt(req.params.upgrade_id, 'upgrade_id');

    // Only include fields that were actually sent — avoids overwriting fields the client didn't touch
    const data = {};
    if (req.body.upgrade_type !== undefined) data.upgrade_type = req.body.upgrade_type;
    if (req.body.material_cost !== undefined) data.material_cost = req.body.material_cost;

    // Reject the request early if nothing was sent — avoids firing a no-op UPDATE against the DB
    if (Object.keys(data).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No fields provided to update');
    }

    const upgrade = await updateRaftUpgrade(upgradeId, data);

    if (!upgrade) {
      throw new AppError('NOT_FOUND', 'Raft upgrade not found');
    }

    res.status(200).json(upgrade);
  } catch (error) {
    next(error);
  }
};

/** Delete a raft upgrade by ID. Returns 204 on success, 404 if not found. */
export const deleteRaftUpgrade = async (req, res, next) => {
  try {
    const upgradeId = parsePositiveInt(req.params.upgrade_id, 'upgrade_id');
    const upgrade = await removeRaftUpgrade(upgradeId);

    if (!upgrade) {
      throw new AppError('NOT_FOUND', 'Raft upgrade not found');
    }

    res.status(204).end(); // 204 No Content — .end() sends the response with no body
  } catch (error) {
    next(error);
  }
};
