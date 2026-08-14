// Defines owner-scoped read endpoints for the player's server-owned raft upgrades.
import { Router } from 'express';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { loadLoggedInPlayer } from '../controllers/playerController.js';
import { getAllRaftUpgrades, getRaftUpgradeById, loadRaftUpgradeForOwner } from '../controllers/playerRaftUpgradeController.js';

export const playerRaftUpgradeRouter = Router();

playerRaftUpgradeRouter.get('/', verifyToken, loadLoggedInPlayer, getAllRaftUpgrades);
playerRaftUpgradeRouter.get('/:upgrade_id', verifyToken, loadLoggedInPlayer, loadRaftUpgradeForOwner, getRaftUpgradeById);
