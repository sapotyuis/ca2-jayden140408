import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  user_id: text('user_id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  materials: integer('materials').notNull().default(0),
  hunger: integer('hunger').notNull().default(100),
  raft_size: integer('raft_size').notNull().default(1),
  energy: integer('energy').notNull().default(100),
  experience: integer('experience').notNull().default(0),
  level: integer('level').notNull().default(1),
  dailyStreak: integer('daily_streak').notNull().default(0),
  lastLogin: text('last_login'),
});

export const item_types = sqliteTable('item_types', {
  item_type_id: integer('item_type_id').primaryKey({autoIncrement: true}),
  item_name: text('item_name').notNull(),
  category: text('category').notNull(),
  material_cost: integer('material_cost').notNull(),
  hunger_restore: integer('hunger_restore').notNull(),
  raft_points: integer('raft_points').notNull(),
  description: text('description').notNull().default(''),
  rarity: text('rarity').notNull().default('common'),
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

/** Repeatable objectives that give survivors a reason to vary their play style. */
export const quests = sqliteTable('quests', {
  quest_id: integer('quest_id').primaryKey({autoIncrement: true}),
  title: text('title').notNull(),
  description: text('description').notNull(),
  quest_type: text('quest_type').notNull(),
  target_value: integer('target_value').notNull().default(1),
  reward_materials: integer('reward_materials').notNull().default(0),
  reward_item_type_id: integer('reward_item_type_id').references(() => item_types.item_type_id),
  reward_item_quantity: integer('reward_item_quantity').notNull().default(0),
  min_raft_size: integer('min_raft_size').notNull().default(1),
  is_active: integer('is_active').notNull().default(1),
});

/** Per-survivor quest progress and claim state. */
export const user_quests = sqliteTable('user_quests', {
  user_quest_id: integer('user_quest_id').primaryKey({autoIncrement: true}),
  user_id: text('user_id').notNull().references(() => users.user_id, { onUpdate: 'cascade' }),
  quest_id: integer('quest_id').notNull().references(() => quests.quest_id),
  progress: integer('progress').notNull().default(0),
  status: text('status').notNull().default('available'),
  assigned_at: text('assigned_at').notNull().$defaultFn(() => new Date().toISOString()),
  completed_at: text('completed_at'),
  claimed_at: text('claimed_at'),
});

/** Catalogue of surprising events that can happen during a debris run. */
export const ocean_events = sqliteTable('ocean_events', {
  event_id: integer('event_id').primaryKey({autoIncrement: true}),
  event_name: text('event_name').notNull(),
  description: text('description').notNull(),
  event_type: text('event_type').notNull(),
  min_raft_size: integer('min_raft_size').notNull().default(1),
  risk_percent: integer('risk_percent').notNull().default(0),
  min_materials: integer('min_materials').notNull().default(0),
  max_materials: integer('max_materials').notNull().default(0),
  hunger_delta: integer('hunger_delta').notNull().default(0),
  reward_item_type_id: integer('reward_item_type_id').references(() => item_types.item_type_id),
  reward_item_quantity: integer('reward_item_quantity').notNull().default(0),
  is_active: integer('is_active').notNull().default(1),
});

/** History of the random ocean events a survivor has encountered. */
export const user_events = sqliteTable('user_events', {
  user_event_id: integer('user_event_id').primaryKey({autoIncrement: true}),
  user_id: text('user_id').notNull().references(() => users.user_id, { onUpdate: 'cascade' }),
  event_id: integer('event_id').notNull().references(() => ocean_events.event_id),
  outcome: text('outcome').notNull(),
  materials_change: integer('materials_change').notNull().default(0),
  hunger_change: integer('hunger_change').notNull().default(0),
  reward_item_type_id: integer('reward_item_type_id').references(() => item_types.item_type_id),
  reward_item_quantity: integer('reward_item_quantity').notNull().default(0),
  occurred_at: text('occurred_at').notNull().$defaultFn(() => new Date().toISOString()),
});
