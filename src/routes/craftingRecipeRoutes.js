import { Router } from 'express';
// body() attaches validation rules to the route as middleware; errors are collected with validationResult() inside the controller
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { getAllCraftingRecipes, getCraftingRecipeById, createCraftingRecipe, patchCraftingRecipe, deleteCraftingRecipe } from '../controllers/craftingRecipeController.js';

export const craftingRecipeRouter = Router();

craftingRecipeRouter.get('/', getAllCraftingRecipes);
craftingRecipeRouter.get('/:recipe_id', getCraftingRecipeById);

craftingRecipeRouter.post(
  '/',
  verifyToken,
  [
    body('result_item_type_id').isInt({ min: 1 }).withMessage('result_item_type_id must be a positive integer'),
    body('ingredient_item_type_id').isInt({ min: 1 }).withMessage('ingredient_item_type_id must be a positive integer'),
    body('quantity_required').optional().isInt({ min: 1 }).withMessage('quantity_required must be a positive integer'),
  ],
  createCraftingRecipe
);

// PATCH is used for partial updates — only the fields sent in the body are applied
craftingRecipeRouter.patch(
  '/:recipe_id',
  verifyToken,
  [
    body('quantity_required').optional().isInt({ min: 1 }).withMessage('quantity_required must be a positive integer'),
  ],
  patchCraftingRecipe
);

craftingRecipeRouter.delete('/:recipe_id', verifyToken, deleteCraftingRecipe);
