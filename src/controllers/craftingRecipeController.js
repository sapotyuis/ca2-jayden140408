// Handles read-only access to the seeded crafting recipes.
import { findAllCraftingRecipes, findCraftingRecipeById } from '../models/craftingRecipeModel.js';
import { AppError } from '../utils/_errors.js';

// Throws AppError directly on invalid input so the error bubbles up through next(error) to the centralized error handler

/** Parses a route/query param to a positive integer or throws VALIDATION_ERROR. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
};

/** Get all crafting recipes. Supports `?result_item_type_id=` and `?ingredient_item_type_id=` query params. */
export const getAllCraftingRecipes = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.result_item_type_id !== undefined) {
      filters.result_item_type_id = parsePositiveInt(req.query.result_item_type_id, 'result_item_type_id'); // if type_id=4, will only GET recipes that produce item 4
    }

    if (req.query.ingredient_item_type_id !== undefined) {
      filters.ingredient_item_type_id = parsePositiveInt(req.query.ingredient_item_type_id, 'ingredient_item_type_id'); // if type_id=1, only GET recipes that require item 1 as ingredients
    }

    const recipes = await findAllCraftingRecipes(filters);
    res.status(200).json(recipes);
  } catch (error) {
    // next(error) passes the error to the centralized errorHandler middleware registered in _errors.js
    next(error);
  }
};

/** Get a single crafting recipe by ID. */
export const getCraftingRecipeById = async (req, res, next) => {
  try {
    const recipeId = parsePositiveInt(req.params.recipe_id, 'recipe_id'); // converts recipe id to a number and throws a validation error if it is not a valid positive integer
    const recipe = await findCraftingRecipeById(recipeId);

    if (!recipe) {
      throw new AppError('NOT_FOUND', 'Crafting recipe not found');
    }

    res.status(200).json(recipe);
  } catch (error) {
    next(error);
  }
};
