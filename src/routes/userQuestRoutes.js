import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { loadCurrentUser } from '../controllers/meController.js';
import {
  getAllUserQuests,
  getUserQuestById,
  validateUserQuestSource,
  createUserQuest,
  loadUserQuestForOwner,
  loadUserQuestForMutation,
  patchUserQuest,
  deleteUserQuest,
} from '../controllers/userQuestController.js';

export const userQuestRouter = Router();

userQuestRouter.get('/', verifyToken, loadCurrentUser, getAllUserQuests);
userQuestRouter.get('/:user_quest_id', verifyToken, loadCurrentUser, loadUserQuestForOwner, getUserQuestById);

userQuestRouter.post(
  '/',
  verifyToken,
  loadCurrentUser,
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
    body('quest_id').isInt({ min: 1 }).withMessage('quest_id must be a positive integer'),
    body('progress').optional().isInt({ min: 0 }).withMessage('progress must be non-negative'),
    body('status').optional().isIn(['available', 'active', 'completed', 'claimed']).withMessage('status is invalid'),
    body('assigned_at').optional().isString().notEmpty().withMessage('assigned_at must be a non-empty string'),
  ],
  handleValidationErrors,
  validateUserQuestSource,
  createUserQuest
);

userQuestRouter.patch(
  '/:user_quest_id',
  verifyToken,
  loadCurrentUser,
  [
    body('progress').optional().isInt({ min: 0 }).withMessage('progress must be non-negative'),
    body('status').optional().isIn(['available', 'active', 'completed', 'claimed']).withMessage('status is invalid'),
    body('completed_at').optional().isString().notEmpty().withMessage('completed_at must be a non-empty string'),
    body('claimed_at').optional().isString().notEmpty().withMessage('claimed_at must be a non-empty string'),
  ],
  handleValidationErrors,
  loadUserQuestForMutation,
  patchUserQuest
);

userQuestRouter.delete('/:user_quest_id', verifyToken, loadCurrentUser, loadUserQuestForMutation, deleteUserQuest);
