import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { getAllQuests, getQuestById, createQuest, patchQuest, deleteQuest } from '../controllers/questController.js';

export const questRouter = Router();

questRouter.get('/', getAllQuests);
questRouter.get('/:quest_id', getQuestById);

questRouter.post(
  '/',
  verifyToken,
  [
    body('title').notEmpty().withMessage('title is required'),
    body('description').notEmpty().withMessage('description is required'),
    body('quest_type').isIn(['collect_debris', 'craft_food', 'survive_event']).withMessage('quest_type is invalid'),
    body('target_value').optional().isInt({ min: 1 }).withMessage('target_value must be a positive integer'),
    body('reward_materials').optional().isInt({ min: 0 }).withMessage('reward_materials must be non-negative'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('min_raft_size').optional().isInt({ min: 1 }).withMessage('min_raft_size must be a positive integer'),
    body('is_active').optional().isInt({ min: 0, max: 1 }).withMessage('is_active must be 0 or 1'),
  ],
  handleValidationErrors,
  createQuest
);

questRouter.patch(
  '/:quest_id',
  verifyToken,
  [
    body('title').optional().notEmpty().withMessage('title must be non-empty'),
    body('description').optional().notEmpty().withMessage('description must be non-empty'),
    body('quest_type').optional().isIn(['collect_debris', 'craft_food', 'survive_event']).withMessage('quest_type is invalid'),
    body('target_value').optional().isInt({ min: 1 }).withMessage('target_value must be a positive integer'),
    body('reward_materials').optional().isInt({ min: 0 }).withMessage('reward_materials must be non-negative'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('min_raft_size').optional().isInt({ min: 1 }).withMessage('min_raft_size must be a positive integer'),
    body('is_active').optional().isInt({ min: 0, max: 1 }).withMessage('is_active must be 0 or 1'),
  ],
  handleValidationErrors,
  patchQuest
);

questRouter.delete('/:quest_id', verifyToken, deleteQuest);
