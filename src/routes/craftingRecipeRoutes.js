// Provides read-only endpoints for the seeded crafting recipes.
import { Router } from 'express';
import {
  getAllCraftingRecipes,
  getCraftingRecipeById,
} from '../controllers/craftingRecipeController.js';

export const craftingRecipeRouter = Router();

craftingRecipeRouter.get('/', getAllCraftingRecipes);
craftingRecipeRouter.get('/:recipe_id', getCraftingRecipeById);
