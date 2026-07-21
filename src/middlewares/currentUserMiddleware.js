import { findUserById } from '../models/userModel.js';

/**
 * Express middleware — loads the survivor named by the verified JWT and attaches it to `req.user`.
 *
 * Runs immediately after verifyToken, which sets `res.locals.userId` from the token payload.
 * Every /api/me handler needs the current user's row, so the lookup lives here once
 * instead of being repeated at the top of each controller.
 *
 * A token can outlive the account it points at (e.g. the user deleted themselves, but the
 * JWT has not expired yet). That is a dead session rather than a missing resource, so it is
 * a 401 — telling the frontend to send the user back to login — not a 404.
 */
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
