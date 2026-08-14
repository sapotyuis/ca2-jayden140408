// Handles read operations for the player's server-owned raft upgrades and enforces ownership.
// Validation rules are defined on the route using body() + handleValidationErrors middleware
import { findAllRaftUpgrades, findRaftUpgradeById } from '../models/playerRaftUpgradeModel.js';
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

/** Load a raft upgrade and ensure it belongs to the authenticated survivor. */
export const loadRaftUpgradeForOwner = async (req, res, next) => {
  try {
    const upgradeId = parsePositiveInt(req.params.upgrade_id, 'upgrade_id');
    const upgrade = await findRaftUpgradeById(upgradeId);

    if (!upgrade || Number(upgrade.user_id) !== Number(req.user.user_id)) {
      throw new AppError('NOT_FOUND', 'Raft upgrade not found');
    }

    res.locals.raftUpgrade = upgrade;
    next();
  } catch (error) {
    next(error);
  }
};
