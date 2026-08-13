/** Controllers for the logged-in survivor's profile and read-only views. */
import {
  findDebrisCollectionLogs,
  findUserById,
  findUserByUsername,
  findUserUpgradeTypes,
  removeUser,
  updateUser,
} from '../models/userModel.js';
import { ensureActiveDebris } from '../models/debrisModel.js';
import { findAllUserItems } from '../models/userItemModel.js';
import { findAllRaftUpgrades } from '../models/raftUpgradeModel.js';
import { findUnexpectedEvents } from '../models/unexpectedEventModel.js';
import { findQuestBoardForUser } from '../models/questModel.js';
import { UPGRADE_SPECS } from '../config/gameRules.js';
import { getNextRecommendedUpgrade } from '../utils/upgradeProgress.js';
import { AppError } from '../utils/_errors.js';

/** Loads the survivor named by the verified JWT and attaches it to req.user. */
export const loadCurrentUser = async (req, res, next) => {
  try {
    const user = await findUserById(res.locals.userId);
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'This account no longer exists. Please log in again.' },
      });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/** GET /api/me — the logged-in survivor's own profile. */
export const getMyProfile = async (req, res) => {
  res.status(200).json(req.user);
};

/** Check whether a requested username conflicts with another survivor. */
export const checkUsernameConflict = async (req, res, next) => {
  try {
    if (req.body.username === undefined) return next();

    const conflict = await findUserByUsername(req.body.username);
    if (conflict && conflict.user_id !== req.user.user_id) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: `Username "${req.body.username}" is already taken` },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/me — rename the survivor. This step calls only the user update model. */
export const updateMyProfile = async (req, res, next) => {
  try {
    const data = {};
    if (req.body.username !== undefined) data.username = req.body.username;
    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', 'No fields provided to update');

    const user = await updateUser(req.user.user_id, data);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/me — the survivor abandons the raft. */
export const deleteMyAccount = async (req, res, next) => {
  try {
    console.log('[GAME] account deletion started', { user_id: req.user.user_id });
    await removeUser(req.user.user_id);
    console.log('[GAME] account deletion completed', { user_id: req.user.user_id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/inventory — everything currently in the survivor's hold. */
export const getMyInventory = async (req, res, next) => {
  try {
    const filters = { user_id: req.user.user_id };
    if (req.query.category) filters.category = req.query.category;
    res.status(200).json(await findAllUserItems(filters));
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/upgrades — the survivor's raft upgrade history. */
export const getMyUpgrades = async (req, res, next) => {
  try {
    res.status(200).json(await findAllRaftUpgrades({ user_id: req.user.user_id }));
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/status — the survivor's progression summary. */
export const getMyStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const upgradeTypes = await findUserUpgradeTypes(user.user_id);
    const nextUpgrade = getNextRecommendedUpgrade(upgradeTypes);
    const nextSpec = UPGRADE_SPECS[nextUpgrade];

    res.status(200).json({
      user: user.username,
      raft_size: user.raft_size,
      materials: user.materials,
      upgrades: upgradeTypes,
      next_recommended_upgrade: nextUpgrade,
      can_upgrade: user.materials >= nextSpec.material_cost,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/collection-logs — recent debris attempts with elapsed time between them. */
export const getMyCollectionLogs = async (req, res, next) => {
  try {
    const rows = await findDebrisCollectionLogs(req.user.user_id, 50);
    const chronological = [...rows].reverse();
    const logs = chronological.map((row, index) => {
      const previous = chronological[index - 1];
      const previousTime = previous ? Date.parse(previous.attempted_at) : NaN;
      const currentTime = Date.parse(row.attempted_at);
      const intervalSeconds = Number.isFinite(previousTime) && Number.isFinite(currentTime)
        ? Math.max(0, (currentTime - previousTime) / 1000)
        : null;

      let foundItems = [];
      try {
        foundItems = JSON.parse(row.found_items || '[]');
      } catch {
        foundItems = [];
      }

      return { ...row, found_items: foundItems, seconds_since_previous: intervalSeconds };
    });
    res.status(200).json(logs.reverse());
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/debris — server-owned floating debris for this survivor. */
export const getMyDebris = async (req, res, next) => {
  try {
    res.status(200).json(await ensureActiveDebris(req.user.user_id));
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/unexpected-events — the server-authored event catalogue for the HUD. */
export const getMyUnexpectedEvents = async (req, res, next) => {
  try {
    res.status(200).json(await findUnexpectedEvents());
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/quests — active quests merged with this survivor's progress. */
export const getMyQuests = async (req, res, next) => {
  try {
    res.status(200).json(await findQuestBoardForUser(req.user.user_id));
  } catch (error) {
    next(error);
  }
};
