import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { loadCurrentUser } from '../middlewares/currentUserMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { VALID_UPGRADE_TYPES } from '../config/gameRules.js';
import {
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  getMyInventory,
  getMyUpgrades,
  getMyStatus,
  collectDebris,
  performRaftUpgrade,
  craftItem,
} from '../controllers/meController.js';

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
    body('hunger').optional().isInt({ min: 0, max: 100 }).withMessage('Hunger must be between 0 and 100'),
  ],
  handleValidationErrors,
  updateMyProfile
);

meRouter.delete('/', deleteMyAccount);

// Progression views
meRouter.get('/status', getMyStatus);
meRouter.get('/inventory', getMyInventory);
meRouter.get('/upgrades', getMyUpgrades);

// Game actions
meRouter.post('/collect-debris', collectDebris);

meRouter.post(
  '/craft',
  [body('result_item_type_id').isInt({ min: 1 }).withMessage('result_item_type_id must be a positive integer')],
  handleValidationErrors,
  craftItem
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
  performRaftUpgrade
);
