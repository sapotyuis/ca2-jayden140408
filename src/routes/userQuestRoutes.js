import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { loadCurrentUser } from '../middlewares/currentUserMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { getAllUserQuests, getUserQuestById, createUserQuest, patchUserQuest, deleteUserQuest } from '../controllers/userQuestController.js';

export const userQuestRouter = Router();

userQuestRouter.get('/', getAllUserQuests);
userQuestRouter.get('/:user_quest_id', getUserQuestById);

userQuestRouter.post(
  '/',
  verifyToken,
  loadCurrentUser,
  [
    body('user_id').notEmpty().withMessage('user_id is required'),
    body('quest_id').isInt({ min: 1 }).withMessage('quest_id must be a positive integer'),
    body('progress').optional().isInt({ min: 0 }).withMessage('progress must be non-negative'),
    body('status').optional().isIn(['available', 'active', 'completed', 'claimed']).withMessage('status is invalid'),
    body('assigned_at').optional().isString().notEmpty().withMessage('assigned_at must be a non-empty string'),
  ],
  handleValidationErrors,
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
  patchUserQuest
);

userQuestRouter.delete('/:user_quest_id', verifyToken, loadCurrentUser, deleteUserQuest);
