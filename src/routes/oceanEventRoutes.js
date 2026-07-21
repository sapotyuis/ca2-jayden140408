import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { getAllOceanEvents, getOceanEventById, createOceanEvent, patchOceanEvent, deleteOceanEvent } from '../controllers/oceanEventController.js';

export const oceanEventRouter = Router();

oceanEventRouter.get('/', getAllOceanEvents);
oceanEventRouter.get('/:event_id', getOceanEventById);

oceanEventRouter.post(
  '/',
  verifyToken,
  [
    body('event_name').notEmpty().withMessage('event_name is required'),
    body('description').notEmpty().withMessage('description is required'),
    body('event_type').isIn(['discovery', 'hazard', 'supply_cache']).withMessage('event_type is invalid'),
    body('min_raft_size').optional().isInt({ min: 1 }).withMessage('min_raft_size must be a positive integer'),
    body('risk_percent').optional().isInt({ min: 0, max: 100 }).withMessage('risk_percent must be between 0 and 100'),
    body('min_materials').optional().isInt({ min: 0 }).withMessage('min_materials must be non-negative'),
    body('max_materials').optional().isInt({ min: 0 }).withMessage('max_materials must be non-negative'),
    body('hunger_delta').optional().isInt().withMessage('hunger_delta must be an integer'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('is_active').optional().isInt({ min: 0, max: 1 }).withMessage('is_active must be 0 or 1'),
  ],
  handleValidationErrors,
  createOceanEvent
);

oceanEventRouter.patch(
  '/:event_id',
  verifyToken,
  [
    body('event_name').optional().notEmpty().withMessage('event_name must be non-empty'),
    body('description').optional().notEmpty().withMessage('description must be non-empty'),
    body('event_type').optional().isIn(['discovery', 'hazard', 'supply_cache']).withMessage('event_type is invalid'),
    body('min_raft_size').optional().isInt({ min: 1 }).withMessage('min_raft_size must be a positive integer'),
    body('risk_percent').optional().isInt({ min: 0, max: 100 }).withMessage('risk_percent must be between 0 and 100'),
    body('min_materials').optional().isInt({ min: 0 }).withMessage('min_materials must be non-negative'),
    body('max_materials').optional().isInt({ min: 0 }).withMessage('max_materials must be non-negative'),
    body('hunger_delta').optional().isInt().withMessage('hunger_delta must be an integer'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('is_active').optional().isInt({ min: 0, max: 1 }).withMessage('is_active must be 0 or 1'),
  ],
  handleValidationErrors,
  patchOceanEvent
);

oceanEventRouter.delete('/:event_id', verifyToken, deleteOceanEvent);
