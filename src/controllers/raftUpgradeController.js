// Validation rules are defined on the route using body() + handleValidationErrors middleware
import { findAllRaftUpgrades, findRaftUpgradeById, insertRaftUpgrade, updateRaftUpgrade, removeRaftUpgrade } from '../models/raftUpgradeModel.js';
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

/** Get all upgrades owned by the authenticated survivor; supports `?upgrade_type=`. */
export const getAllRaftUpgrades = async (req, res, next) => {
  try {
    const filters = { user_id: req.user.user_id };

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
    res.status(200).json(res.locals.raftUpgrade);
  } catch (error) {
    next(error);
  }
};

/** Verify that the requested upgrade owner is the authenticated survivor. */
export const validateRaftUpgradeUser = async (req, res, next) => {
  try {
    if (Number(req.body.user_id) !== Number(req.user.user_id)) {
      throw new AppError('VALIDATION_ERROR', 'user_id must match the authenticated user');
    }

    res.locals.raftUpgradeUser = req.user;
    next();
  } catch (error) {
    next(error);
  }
};

/** Load a raft upgrade and ensure it belongs to the authenticated survivor. */
export const loadRaftUpgradeForOwner = async (req, res, next) => {
  try {
    const upgradeId = parsePositiveInt(req.params.upgrade_id, 'upgrade_id');
    const upgrade = await findRaftUpgradeById(upgradeId);

    if (!upgrade || Number(upgrade.user_id) !== Number(req.user.user_id)) {
      throw new AppError('NOT_FOUND', 'Raft upgrade not found');
    }

    res.locals.upgradeId = upgradeId;
    res.locals.raftUpgrade = upgrade;
    next();
  } catch (error) {
    next(error);
  }
};

/** Create a new raft upgrade. This step calls only the upgrade insert model. */
export const createRaftUpgrade = async (req, res, next) => {
  try {
    const data = {
      user_id: res.locals.raftUpgradeUser.user_id,
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
    const upgradeId = res.locals.upgradeId;

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
    const upgradeId = res.locals.upgradeId;
    const upgrade = await removeRaftUpgrade(upgradeId);

    if (!upgrade) {
      throw new AppError('NOT_FOUND', 'Raft upgrade not found');
    }

    res.status(204).end(); // 204 No Content — .end() sends the response with no body
  } catch (error) {
    next(error);
  }
};
