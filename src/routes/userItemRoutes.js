import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { loadCurrentUser } from '../controllers/meController.js';
import { getAllUserItems, getUserItemById, loadUserItemForOwner, validateUserItemOwner, validateUserItemType, createUserItem, patchUserItem, deleteUserItem } from '../controllers/userItemController.js';

export const userItemRouter = Router();

userItemRouter.get('/', verifyToken, loadCurrentUser, getAllUserItems);
userItemRouter.get('/:user_item_id', verifyToken, loadCurrentUser, loadUserItemForOwner, getUserItemById);

userItemRouter.post(
  '/',
  verifyToken,
  loadCurrentUser,
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
    body('item_type_id').isInt({ min: 1 }).withMessage('item_type_id must be a positive integer'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('acquired_at').optional().isString().notEmpty().withMessage('acquired_at must be a non-empty string'),
  ],
  handleValidationErrors,
  validateUserItemOwner,
  validateUserItemType,
  createUserItem
);

userItemRouter.patch(
  '/:user_item_id',
  verifyToken,
  loadCurrentUser,
  loadUserItemForOwner,
  [
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('acquired_at').optional().isString().notEmpty().withMessage('acquired_at must be a non-empty string'),
  ],
  handleValidationErrors,
  patchUserItem
);

userItemRouter.delete('/:user_item_id', verifyToken, loadCurrentUser, loadUserItemForOwner, deleteUserItem);
