import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { VALID_EVENT_TYPES, VALID_UPGRADE_TYPES } from '../config/gameRules.js';
import {
  getAllOceanEvents,
  getOceanEventById,
  validateOceanEventRewardItem,
  validateOceanEventLossItem,
  createOceanEvent,
  loadOceanEventForPatch,
  patchOceanEvent,
  deleteOceanEvent,
} from '../controllers/oceanEventController.js';

export const oceanEventRouter = Router();

oceanEventRouter.get('/', getAllOceanEvents);
oceanEventRouter.get('/:event_id', getOceanEventById);

oceanEventRouter.post(
  '/',
  verifyToken,
  [
    body('event_name').notEmpty().withMessage('event_name is required'),
    body('description').notEmpty().withMessage('description is required'),
    body('event_type').isIn(VALID_EVENT_TYPES).withMessage('event_type is invalid'),
    body('is_unexpected').optional().isInt({ min: 0, max: 1 }).withMessage('is_unexpected must be 0 or 1'),
    body('min_raft_size').optional().isInt({ min: 1 }).withMessage('min_raft_size must be a positive integer'),
    body('risk_percent').optional().isInt({ min: 0, max: 100 }).withMessage('risk_percent must be between 0 and 100'),
    body('min_materials').optional().isInt({ min: 0 }).withMessage('min_materials must be non-negative'),
    body('max_materials').optional().isInt({ min: 0 }).withMessage('max_materials must be non-negative'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('prevention_upgrade_type').optional().isIn(VALID_UPGRADE_TYPES).withMessage('prevention_upgrade_type is invalid'),
    body('loss_item_type_id').optional().isInt({ min: 1 }).withMessage('loss_item_type_id must be a positive integer'),
    body('loss_item_quantity').optional().isInt({ min: 0 }).withMessage('loss_item_quantity must be non-negative'),
    body('cooldown_seconds').optional().isInt({ min: 0 }).withMessage('cooldown_seconds must be non-negative'),
    body('is_active').optional().isInt({ min: 0, max: 1 }).withMessage('is_active must be 0 or 1'),
  ],
  handleValidationErrors,
  validateOceanEventRewardItem,
  validateOceanEventLossItem,
  createOceanEvent
);

oceanEventRouter.patch(
  '/:event_id',
  verifyToken,
  [
    body('event_name').optional().notEmpty().withMessage('event_name must be non-empty'),
    body('description').optional().notEmpty().withMessage('description must be non-empty'),
    body('event_type').optional().isIn(VALID_EVENT_TYPES).withMessage('event_type is invalid'),
    body('is_unexpected').optional().isInt({ min: 0, max: 1 }).withMessage('is_unexpected must be 0 or 1'),
    body('min_raft_size').optional().isInt({ min: 1 }).withMessage('min_raft_size must be a positive integer'),
    body('risk_percent').optional().isInt({ min: 0, max: 100 }).withMessage('risk_percent must be between 0 and 100'),
    body('min_materials').optional().isInt({ min: 0 }).withMessage('min_materials must be non-negative'),
    body('max_materials').optional().isInt({ min: 0 }).withMessage('max_materials must be non-negative'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('prevention_upgrade_type').optional().isIn(VALID_UPGRADE_TYPES).withMessage('prevention_upgrade_type is invalid'),
    body('loss_item_type_id').optional().isInt({ min: 1 }).withMessage('loss_item_type_id must be a positive integer'),
    body('loss_item_quantity').optional().isInt({ min: 0 }).withMessage('loss_item_quantity must be non-negative'),
    body('cooldown_seconds').optional().isInt({ min: 0 }).withMessage('cooldown_seconds must be non-negative'),
    body('is_active').optional().isInt({ min: 0, max: 1 }).withMessage('is_active must be 0 or 1'),
  ],
  handleValidationErrors,
  loadOceanEventForPatch,
  validateOceanEventRewardItem,
  validateOceanEventLossItem,
  patchOceanEvent
);

oceanEventRouter.delete('/:event_id', verifyToken, deleteOceanEvent);
