import { Router } from 'express';
// body() attaches validation rules to the route as middleware; errors are collected with validationResult() inside the controller
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { getAllItemTypes, getItemTypeById, createItemType, patchItemType, deleteItemType } from '../controllers/itemTypeController.js';

export const itemTypeRouter = Router();

itemTypeRouter.get('/', getAllItemTypes);
itemTypeRouter.get('/:item_type_id', getItemTypeById);

itemTypeRouter.post(
  '/',
  verifyToken,
  [
    body('item_name').notEmpty().withMessage('item_name is required'),
    body('category').isIn(['material', 'equipment']).withMessage('category must be material or equipment'),
    body('material_cost').isInt({ min: 0 }).withMessage('material_cost must be a non-negative integer'),
    body('raft_points').isInt({ min: 0 }).withMessage('raft_points must be a non-negative integer'),
  ],
  handleValidationErrors,
  createItemType
);

// PATCH is used for partial updates — only the fields sent in the body are applied
itemTypeRouter.patch(
  '/:item_type_id',
  verifyToken,
  [
    body('item_name').optional().notEmpty().withMessage('item_name must be a non-empty string'),
    body('category').optional().isIn(['material', 'equipment']).withMessage('category must be material or equipment'),
    body('material_cost').optional().isInt({ min: 0 }).withMessage('material_cost must be a non-negative integer'),
    body('raft_points').optional().isInt({ min: 0 }).withMessage('raft_points must be a non-negative integer'),
  ],
  handleValidationErrors,
  patchItemType
);

itemTypeRouter.delete('/:item_type_id', verifyToken, deleteItemType);
