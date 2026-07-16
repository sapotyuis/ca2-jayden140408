// ✏️ EDIT THIS FILE — add seed data for your own tables below the example tasks.

/**
 * Seed data and database reset script. Run with: npm run db
 *
 * To add your own seed data:
 *   1. Import your table schema from './schema.js'
 *   2. Add a sample data array
 *   3. Insert it inside the seed() function with db.insert()
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Import your table schemas here
import {users, item_types, user_items, crafting_recipes, raft_upgrades } from './schema.js';
import { hashPassword } from '../middlewares/bcryptMiddleware.js';

// --- Seed data ---



const sampleUsers = [
  { user_id: 'rafter_SurvivorJay', username: 'SurvivorJay', password: 'password123', materials: 0, hunger: 100, raft_size: 1 },
  { user_id: 'rafter_Ocean', username: 'Ocean', password: 'password1234', materials: 50, hunger: 70, raft_size: 3 },
  { user_id: 'rafter_Rafter', username: 'Rafter', password: 'password12345', materials: 200, hunger: 40, raft_size: 8 },
];


const sampleItemType = [
  { item_name: 'Wood Plank', category: 'material', material_cost: 0, hunger_restore: 0, raft_points: 5 },
  { item_name: 'Plastic', category: 'material', material_cost: 0, hunger_restore: 0, raft_points: 3 },
  { item_name: 'Rope', category: 'material', material_cost: 0, hunger_restore: 0, raft_points: 2 },
  { item_name: 'Grilled Fish', category: 'food', material_cost: 5, hunger_restore: 40, raft_points: 0 },
  { item_name: 'Coconut', category: 'food', material_cost: 2, hunger_restore: 20, raft_points: 0 },
  { item_name: 'Paddle', category: 'equipment', material_cost: 10, hunger_restore: 0, raft_points: 0 },
  { item_name: 'Collection Hook', category: 'equipment', material_cost: 15, hunger_restore: 0, raft_points: 0 },
];


const sampleUserItems = [
  { user_id: 'rafter_SurvivorJay', item_type_id: 1, quantity: 1, acquired_at: '2026-01-10T09:00:00.000Z' },
  { user_id: 'rafter_Ocean', item_type_id: 2, quantity: 2, acquired_at: '2026-01-10T10:00:00.000Z' },
  { user_id: 'rafter_Rafter', item_type_id: 3, quantity: 3, acquired_at: '2026-01-11T08:00:00.000Z' },
  { user_id: 'rafter_Ocean', item_type_id: 4, quantity: 1, acquired_at: '2026-01-12T14:00:00.000Z' },
];

const sampleCraftingRecipes = [
  { result_item_type_id: 4, ingredient_item_type_id: 1, quantity_required: 2 },
  { result_item_type_id: 6, ingredient_item_type_id: 1, quantity_required: 3 },
  { result_item_type_id: 6, ingredient_item_type_id: 3, quantity_required: 1 },
  { result_item_type_id: 7, ingredient_item_type_id: 2, quantity_required: 4 },
  { result_item_type_id: 7, ingredient_item_type_id: 3, quantity_required: 2 },
];

const sampleRaftUpgrades = [
  { user_id: 'rafter_SurvivorJay', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-10T09:00:00.000Z' },
  { user_id: 'rafter_Ocean', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-11T10:00:00.000Z' },
  { user_id: 'rafter_Ocean', upgrade_type: 'Sail', material_cost: 20, applied_at: '2026-01-12T12:00:00.000Z' },
  { user_id: 'rafter_Rafter', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-13T08:00:00.000Z' },
  { user_id: 'rafter_Rafter', upgrade_type: 'Sail', material_cost: 20, applied_at: '2026-01-13T09:00:00.000Z' },
  { user_id: 'rafter_Rafter', upgrade_type: 'Net Launcher', material_cost: 35, applied_at: '2026-01-13T10:00:00.000Z' },
];

// --- Seed function ---

/** Insert seed data into the database. */
export const seed = async (db) => {

  const hashedUsers = await Promise.all(
    sampleUsers.map(async (user) => ({ ...user, password: await hashPassword(user.password) }))
  );
  await db.insert(users).values(hashedUsers);
  console.log(`  Inserted ${sampleUsers.length} users`);

  await db.insert(item_types).values(sampleItemType);
  console.log(`  Inserted ${sampleItemType.length} item_types`);

  await db.insert(user_items).values(sampleUserItems);
  console.log(`  Inserted ${sampleUserItems.length} user_items`);

  await db.insert(crafting_recipes).values(sampleCraftingRecipes);
  console.log(`  Inserted ${sampleCraftingRecipes.length} crafting_recipes`);

  await db.insert(raft_upgrades).values(sampleRaftUpgrades);
  console.log(`  Inserted ${sampleRaftUpgrades.length} raft_upgrades`);
};

// --- Database reset (no need to modify below) ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const dbUrl = process.env.DATABASE_URL || 'file:local.db';
const dbPath = dbUrl.replace('file:', '');
const absoluteDbPath = path.resolve(projectRoot, dbPath);

const resetDatabase = async () => {
  try {
    // Step 1 — Delete the old database file
    if (fs.existsSync(absoluteDbPath)) {
      fs.unlinkSync(absoluteDbPath);
      console.log(`Deleted old database: ${dbPath}`);
    }

    // Step 2 — Recreate tables from schema.js
    console.log('Creating tables from schema...');
    execSync('npx drizzle-kit push', {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    // Step 3 — Insert seed data
    console.log('Seeding database...');
    const { db } = await import('./connection.js');
    await seed(db);

    console.log('Done! Database is ready.');
  } catch (error) {
    console.error('Failed to reset database:', error.message);
    process.exit(1);
  }
};

resetDatabase();
