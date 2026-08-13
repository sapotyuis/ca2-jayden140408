import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { loadCurrentUser } from '../controllers/meController.js';
import {
  getAllUserEvents,
  getUserEventById,
  validateUserEventSource,
  validateUserEventRewardItem,
  createUserEvent,
  loadUserEventForOwner,
  loadUserEventForMutation,
  patchUserEvent,
  deleteUserEvent,
} from '../controllers/userEventController.js';

export const userEventRouter = Router();

userEventRouter.get('/', verifyToken, loadCurrentUser, getAllUserEvents);
userEventRouter.get('/:user_event_id', verifyToken, loadCurrentUser, loadUserEventForOwner, getUserEventById);

userEventRouter.post(
  '/',
  verifyToken,
  loadCurrentUser,
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
    body('event_id').isInt({ min: 1 }).withMessage('event_id must be a positive integer'),
    body('outcome').notEmpty().withMessage('outcome is required'),
    body('materials_change').optional().isInt().withMessage('materials_change must be an integer'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('occurred_at').optional().isString().notEmpty().withMessage('occurred_at must be a non-empty string'),
  ],
  handleValidationErrors,
  validateUserEventSource,
  validateUserEventRewardItem,
  createUserEvent
);

userEventRouter.patch(
  '/:user_event_id',
  verifyToken,
  loadCurrentUser,
  [
    body('outcome').optional().notEmpty().withMessage('outcome must be non-empty'),
    body('materials_change').optional().isInt().withMessage('materials_change must be an integer'),
    body('reward_item_type_id').optional().isInt({ min: 1 }).withMessage('reward_item_type_id must be a positive integer'),
    body('reward_item_quantity').optional().isInt({ min: 0 }).withMessage('reward_item_quantity must be non-negative'),
    body('occurred_at').optional().isString().notEmpty().withMessage('occurred_at must be a non-empty string'),
  ],
  handleValidationErrors,
  loadUserEventForMutation,
  validateUserEventRewardItem,
  patchUserEvent
);

userEventRouter.delete('/:user_event_id', verifyToken, loadCurrentUser, loadUserEventForMutation, deleteUserEvent);
