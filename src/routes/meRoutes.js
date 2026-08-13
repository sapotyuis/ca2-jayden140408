import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { VALID_UPGRADE_TYPES } from '../config/gameRules.js';
import {
  loadCurrentUser,
  getMyProfile,
  checkUsernameConflict,
  updateMyProfile,
  deleteMyAccount,
  getMyInventory,
  getMyUpgrades,
  getMyStatus,
  getMyCollectionLogs,
  getMyDebris,
  getMyUnexpectedEvents,
  getMyQuests,
} from '../controllers/meController.js';
import {
  collectDebrisPipeline,
  craftItemPipeline,
  raftUpgradePipeline,
  unexpectedEventPipeline,
  questRewardPipeline,
} from '../controllers/gameplayStepsController.js';
import {
  sendCollectedDebris,
  sendCraftedItem,
  sendRaftUpgrade,
  sendUnexpectedEvent,
  sendQuestReward,
} from '../controllers/meActionResponseController.js';

export const meRouter = Router();

/**
 * Every route below is the logged-in survivor acting on their own raft.
 *
 * router.use() applies both middlewares to the whole router, so protection cannot be
 * forgotten when a new route is added later — the secure default is the only default.
 * verifyToken rejects a missing/invalid token with 401 and sets res.locals.userId;
 * loadCurrentUser then turns that id into req.user.
 */
meRouter.use(verifyToken, loadCurrentUser);

// Profile
meRouter.get('/', getMyProfile);

meRouter.patch(
  '/',
  [
    body('username').optional().notEmpty().withMessage('Username cannot be empty'),
  ],
  handleValidationErrors,
  checkUsernameConflict,
  updateMyProfile
);

meRouter.delete('/', deleteMyAccount);

// Progression views
meRouter.get('/status', getMyStatus);
meRouter.get('/inventory', getMyInventory);
meRouter.get('/upgrades', getMyUpgrades);
meRouter.get('/quests', getMyQuests);
meRouter.get('/collection-logs', getMyCollectionLogs);
meRouter.get('/debris', getMyDebris);
meRouter.get('/unexpected-events', getMyUnexpectedEvents);

// Game actions
meRouter.post('/debris/:debris_id/collect', collectDebrisPipeline, sendCollectedDebris);
// Compatibility path: it now requires a server-issued debris_id in the body and cannot grant random loot.
meRouter.post('/collect-debris', collectDebrisPipeline, sendCollectedDebris);

meRouter.post(
  '/unexpected-events/resolve',
  [body('event_id').isInt({ min: 1 }).withMessage('event_id must be a positive integer')],
  handleValidationErrors,
  unexpectedEventPipeline,
  sendUnexpectedEvent
);

meRouter.post(
  '/craft',
  [body('result_item_type_id').isInt({ min: 1 }).withMessage('result_item_type_id must be a positive integer')],
  handleValidationErrors,
  craftItemPipeline,
  sendCraftedItem
);

meRouter.post(
  '/upgrade-raft',
  [
    body('upgrade_type')
      .notEmpty()
      .withMessage('upgrade_type is required')
      .isIn(VALID_UPGRADE_TYPES)
      .withMessage(`upgrade_type must be one of: ${VALID_UPGRADE_TYPES.join(', ')}`),
  ],
  handleValidationErrors,
  raftUpgradePipeline,
  sendRaftUpgrade
);

meRouter.post('/quests/:quest_id/claim', questRewardPipeline, sendQuestReward);
