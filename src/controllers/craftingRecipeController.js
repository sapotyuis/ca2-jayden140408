// Validation rules are defined on the route using body() middleware; validationResult() collects any failures here
import { validationResult } from 'express-validator';
import { findAllCraftingRecipes, findCraftingRecipeById, insertCraftingRecipe, updateCraftingRecipe, removeCraftingRecipe } from '../models/craftingRecipeModel.js';
import { findItemTypeById } from '../models/itemTypeModel.js';
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

/** Create a new crafting recipe. Validation rules are on the route; results checked here. */
export const createCraftingRecipe = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    // Route middleware (body()) stores errors; validationResult() collects them. [0] throws only the first failure.
    if (!errors.isEmpty()) {
      throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
    }

    // Check FKs exist before inserting — skipping this causes the DB to throw a raw constraint error (500)
    const resultItemType = await findItemTypeById(req.body.result_item_type_id);
    if (!resultItemType) {
      throw new AppError('NOT_FOUND', `Item type with id ${req.body.result_item_type_id} not found`);
    }

    const ingredientItemType = await findItemTypeById(req.body.ingredient_item_type_id);
    if (!ingredientItemType) {
      throw new AppError('NOT_FOUND', `Item type with id ${req.body.ingredient_item_type_id} not found`);
    }

    const data = {
      result_item_type_id: req.body.result_item_type_id,
      ingredient_item_type_id: req.body.ingredient_item_type_id,
    };

    // quantity_required is optional — only add it to data if the client actually sent it
    if (req.body.quantity_required !== undefined) data.quantity_required = req.body.quantity_required;

    const recipe = await insertCraftingRecipe(data);
    res.status(201).json(recipe);
  } catch (error) {
    next(error);
  }
};

/** Update a crafting recipe by ID. Accepts `quantity_required` in the body. */
export const patchCraftingRecipe = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
    }

    const recipeId = parsePositiveInt(req.params.recipe_id, 'recipe_id');

    const data = {};
    if (req.body.quantity_required !== undefined) data.quantity_required = req.body.quantity_required;

    // Reject the request early if nothing was sent — avoids firing a no-op UPDATE against the DB
    if (Object.keys(data).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No fields provided to update');
    }

    const recipe = await updateCraftingRecipe(recipeId, data);

    if (!recipe) {
      throw new AppError('NOT_FOUND', 'Crafting recipe not found');
    }

    res.status(200).json(recipe);
  } catch (error) {
    next(error);
  }
};

/** Delete a crafting recipe by ID. Returns 204 on success, 404 if not found. */
export const deleteCraftingRecipe = async (req, res, next) => {
  try {
    const recipeId = parsePositiveInt(req.params.recipe_id, 'recipe_id');
    const recipe = await removeCraftingRecipe(recipeId);

    if (!recipe) {
      throw new AppError('NOT_FOUND', 'Crafting recipe not found');
    }

    res.status(204).end(); // 204 No Content — .end() sends the response with no body
  } catch (error) {
    next(error);
  }
};
