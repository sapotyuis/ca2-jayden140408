/**
 * Controller for /api/users — PUBLIC, READ-ONLY views of survivors.
 *
 * Anything that changes a survivor lives in meController and acts on the logged-in user
 * instead, so there is no route anywhere that lets one player write to another's raft.
 * These reads select publicUserFields in the model, so the password hash is never exposed.
 */
import { findAllUsers, findLeaderboardUsers, findUserById } from '../models/userModel.js';
import { AppError } from '../utils/_errors.js';

/** Parses a query param to a positive integer or throws VALIDATION_ERROR. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
};

/**
 * GET /api/users — list survivors.
 * Supports ?search=<username> and ?raft_size=<n> as filters; both are applied in SQL by the
 * model rather than in JavaScript, so the database never ships rows the caller did not ask for.
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.search) {
      filters.search = req.query.search;
    }

    if (req.query.raft_size !== undefined) {
      filters.raft_size = parsePositiveInt(req.query.raft_size, 'raft_size');
    }

    const users = await findAllUsers(filters);
    res.status(200).json(users);
  } catch (error) {
    // next(error) hands off to the centralised errorHandler registered in _errors.js.
    next(error);
  }
};

/** GET /api/users/leaderboard — return only the five highest-ranked public survivors. */
export const getLeaderboard = async (req, res, next) => {
  try {
    const users = await findLeaderboardUsers(5);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

/** GET /api/users/:user_id — a single survivor's public profile. */
export const getUserById = async (req, res, next) => {
  try {
    const userId = String(req.params.user_id || '').trim();
    if (userId === '') {
      throw new AppError('VALIDATION_ERROR', 'user_id must be a non-empty string');
    }

    const user = await findUserById(userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found');
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};
