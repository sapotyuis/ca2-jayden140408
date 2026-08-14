// Defines owner-scoped read endpoints for the player's server-owned quest progress.
import { Router } from 'express';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { loadLoggedInPlayer } from '../controllers/playerController.js';
import {
  getAllUserQuests,
  getUserQuestById,
  loadUserQuestForOwner,
} from '../controllers/playerQuestProgressController.js';

export const playerQuestProgressRouter = Router();

playerQuestProgressRouter.get('/', verifyToken, loadLoggedInPlayer, getAllUserQuests);
playerQuestProgressRouter.get('/:user_quest_id', verifyToken, loadLoggedInPlayer, loadUserQuestForOwner, getUserQuestById);
