// Defines owner-scoped read endpoints for the player's server-owned ocean-event history.
import { Router } from 'express';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { loadLoggedInPlayer } from '../controllers/playerController.js';
import {
  getAllUserEvents,
  getUserEventById,
  loadUserEventForOwner,
} from '../controllers/playerEventHistoryController.js';

export const playerEventHistoryRouter = Router();

playerEventHistoryRouter.get('/', verifyToken, loadLoggedInPlayer, getAllUserEvents);
playerEventHistoryRouter.get('/:user_event_id', verifyToken, loadLoggedInPlayer, loadUserEventForOwner, getUserEventById);
