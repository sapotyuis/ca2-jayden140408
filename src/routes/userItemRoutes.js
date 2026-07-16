import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { getAllUserItems, getUserItemById, createUserItem, patchUserItem, deleteUserItem } from '../controllers/userItemController.js';

export const userItemRouter = Router();

userItemRouter.get('/', getAllUserItems);
userItemRouter.get('/:user_item_id', getUserItemById);

userItemRouter.post(
  '/',
  verifyToken,
  [
    body('user_id').notEmpty().withMessage('user_id is required'),
    body('item_type_id').isInt({ min: 1 }).withMessage('item_type_id must be a positive integer'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('acquired_at').optional().isString().notEmpty().withMessage('acquired_at must be a non-empty string'),
  ],
  createUserItem
);

userItemRouter.patch(
  '/:user_item_id',
  verifyToken,
  [
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('acquired_at').optional().isString().notEmpty().withMessage('acquired_at must be a non-empty string'),
  ],
  patchUserItem
);

userItemRouter.delete('/:user_item_id', verifyToken, deleteUserItem);