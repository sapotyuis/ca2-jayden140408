import { Router } from 'express';
import { getAllUsers, getLeaderboard, getUserById } from '../controllers/userController.js';

export const userRouter = Router();

/**
 * Public, read-only survivor directory — this is what powers the leaderboard and lets one
 * player look at another's raft. Deliberately unauthenticated: none of it is secret, and
 * none of it can change anything.
 *
 * Creating a survivor is POST /api/auth/register.
 * Changing or deleting one is PATCH / DELETE /api/me, which act on the token's owner.
 */
userRouter.get('/', getAllUsers);
userRouter.get('/leaderboard', getLeaderboard);
userRouter.get('/:user_id', getUserById);
