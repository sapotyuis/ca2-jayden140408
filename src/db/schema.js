import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  user_id: text('user_id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  materials: integer('materials').notNull().default(0),
  hunger: integer('hunger').notNull().default(100),
  raft_size: integer('raft_size').notNull().default(1),
  lastLogin: text('last_login'),
});

export const item_types = sqliteTable('item_types', {
  item_type_id: integer('item_type_id').primaryKey({autoIncrement: true}),
  item_name: text('item_name').notNull(),
  category: text('category').notNull(),
  material_cost: integer('material_cost').notNull(),
  hunger_restore: integer('hunger_restore').notNull(),
  raft_points: integer('raft_points').notNull(),
});

export const user_items = sqliteTable('user_items', {
  user_item_id: integer('user_item_id').primaryKey({autoIncrement: true}),
  user_id: text('user_id').notNull().references(() => users.user_id, { onUpdate: 'cascade' }),
  item_type_id: integer('item_type_id').notNull().references(() => item_types.item_type_id),
  quantity: integer('quantity').notNull().default(1),
  acquired_at: text('acquired_at').notNull(),
});

export const crafting_recipes = sqliteTable('crafting_recipes', {
  recipe_id: integer('recipe_id').primaryKey({autoIncrement: true}),
  result_item_type_id: integer('result_item_type_id').notNull().references(() => item_types.item_type_id),
  ingredient_item_type_id: integer('ingredient_item_type_id').notNull().references(() => item_types.item_type_id),
  quantity_required: integer('quantity_required').notNull().default(1),
});

export const raft_upgrades = sqliteTable('raft_upgrades', {
  upgrade_id: integer('upgrade_id').primaryKey({autoIncrement: true}),
  user_id: text('user_id').notNull().references(() => users.user_id, { onUpdate: 'cascade' }),
  upgrade_type: text('upgrade_type').notNull(),
  material_cost: integer('material_cost').notNull(),
  applied_at: text('applied_at').notNull().$defaultFn(() => new Date().toISOString()),
});
