// Defines owner-scoped read endpoints for the player's server-owned inventory.
import { Router } from 'express';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { loadLoggedInPlayer } from '../controllers/playerController.js';
import { getAllUserItems, getUserItemById, loadUserItemForOwner } from '../controllers/playerInventoryController.js';

export const playerInventoryRouter = Router();

playerInventoryRouter.get('/', verifyToken, loadLoggedInPlayer, getAllUserItems);
playerInventoryRouter.get('/:user_item_id', verifyToken, loadLoggedInPlayer, loadUserItemForOwner, getUserItemById);
