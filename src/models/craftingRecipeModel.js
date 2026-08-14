import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { crafting_recipes } from '../db/schema.js';

export { crafting_recipes };

/** Get all crafting recipes. Supports optional `result_item_type_id` and `ingredient_item_type_id` filters. */
export const findAllCraftingRecipes = async (filters = {}, executor = db) => {
  const conditions = [];

  if (filters.result_item_type_id !== undefined) {
    conditions.push(eq(crafting_recipes.result_item_type_id, filters.result_item_type_id));
  }

  if (filters.ingredient_item_type_id !== undefined) {
    conditions.push(eq(crafting_recipes.ingredient_item_type_id, filters.ingredient_item_type_id));
  }

  if (conditions.length > 0) {
    return await executor.select().from(crafting_recipes).where(and(...conditions));
  }

  return await executor.select().from(crafting_recipes);
};

/** Get a single crafting recipe by ID. Returns undefined if not found. */
export const findCraftingRecipeById = async (id) => {
  const rows = await db.select().from(crafting_recipes).where(eq(crafting_recipes.recipe_id, Number(id)));
  return rows[0];
};
