// Defines authenticated survivor profile, raft, inventory, quest, and gameplay action endpoints.
import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { VALID_UPGRADE_TYPES } from '../config/gameRules.js';
import {
  loadLoggedInPlayer,
  getPlayerProfile,
  checkPlayerUsernameConflict,
  patchPlayerProfile,
  deleteMyAccount,
  getPlayerInventory,
  getPlayerUpgrades,
  getPlayerStatus,
  getPlayerCollectionLogs,
  getPlayerDebris,
  getPlayerUnexpectedEvents,
  getPlayerQuests,
} from '../controllers/playerController.js';
import {
  collectDebrisAction,
  craftItemAction,
  upgradeRaftAction,
  resolveOceanEventAction,
  claimQuestRewardAction,
} from '../controllers/gameplayActionsController.js';
import {
  sendCollectedDebris,
  sendCraftedItem,
  sendRaftUpgrade,
  sendUnexpectedEvent,
  sendQuestReward,
} from '../controllers/gameplayResponsesController.js';

export const playerRouter = Router();

/**
 * Every route below is the logged-in survivor acting on their own raft.
 *
 * router.use() applies both middlewares to the whole router, so protection cannot be
 * forgotten when a new route is added later — the secure default is the only default.
 * verifyToken rejects a missing/invalid token with 401 and sets res.locals.userId;
 * loadLoggedInPlayer then turns that id into req.user.
 */
playerRouter.use(verifyToken, loadLoggedInPlayer);

// Profile
playerRouter.get('/', getPlayerProfile);

playerRouter.patch(
  '/',
  [
    body('username').optional().notEmpty().withMessage('Username cannot be empty'),
  ],
  handleValidationErrors,
  checkPlayerUsernameConflict,
  patchPlayerProfile
);

playerRouter.delete('/', deleteMyAccount);

// Progression views
playerRouter.get('/status', getPlayerStatus);
playerRouter.get('/inventory', getPlayerInventory);
playerRouter.get('/upgrades', getPlayerUpgrades);
playerRouter.get('/quests', getPlayerQuests);
playerRouter.get('/collection-logs', getPlayerCollectionLogs);
playerRouter.get('/debris', getPlayerDebris);
playerRouter.get('/unexpected-events', getPlayerUnexpectedEvents);

// Game actions
playerRouter.post('/debris/:debris_id/collect', collectDebrisAction, sendCollectedDebris);
// Compatibility path: it now requires a server-issued debris_id in the body and cannot grant random loot.
playerRouter.post('/collect-debris', collectDebrisAction, sendCollectedDebris);

playerRouter.post(
  '/unexpected-events/resolve',
  [body('event_id').isInt({ min: 1 }).withMessage('event_id must be a positive integer')],
  handleValidationErrors,
  resolveOceanEventAction,
  sendUnexpectedEvent
);

playerRouter.post(
  '/craft',
  [body('result_item_type_id').isInt({ min: 1 }).withMessage('result_item_type_id must be a positive integer')],
  handleValidationErrors,
  craftItemAction,
  sendCraftedItem
);

playerRouter.post(
  '/upgrade-raft',
  [
    body('upgrade_type')
      .notEmpty()
      .withMessage('upgrade_type is required')
      .isIn(VALID_UPGRADE_TYPES)
      .withMessage(`upgrade_type must be one of: ${VALID_UPGRADE_TYPES.join(', ')}`),
  ],
  handleValidationErrors,
  upgradeRaftAction,
  sendRaftUpgrade
);

playerRouter.post('/quests/:quest_id/claim', claimQuestRewardAction, sendQuestReward);
