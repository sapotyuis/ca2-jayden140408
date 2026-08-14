// Defines public survivor directory, profile, and leaderboard endpoints.
import { Router } from 'express';
import { getAllUsers, getLeaderboard, getUserById } from '../controllers/survivorDirectoryController.js';

export const survivorDirectoryRouter = Router();

/**
 * Public, read-only survivor directory — this is what powers the leaderboard and lets one
 * player look at another's raft. Deliberately unauthenticated: none of it is secret, and
 * none of it can change anything.
 *
 * Creating a survivor is POST /api/auth/register.
 * Changing or deleting one is PATCH / DELETE /api/me, which act on the token's owner.
 */
survivorDirectoryRouter.get('/', getAllUsers);
survivorDirectoryRouter.get('/leaderboard', getLeaderboard);
survivorDirectoryRouter.get('/:user_id', getUserById);
