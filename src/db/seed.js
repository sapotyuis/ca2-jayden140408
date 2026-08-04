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
import bcrypt from 'bcrypt';
import 'dotenv/config';

// Import your table schemas here
import {
  users,
  item_types,
  user_items,
  crafting_recipes,
  raft_upgrades,
  quests,
  user_quests,
  ocean_events,
  user_events,
} from './schema.js';

// --- Seed data ---

const sampleUsers = [
  {
    user_id: 'rafter_SurvivorJay', username: 'SurvivorJay', password: 'password123',
    materials: 0, hunger: 100, raft_size: 1, energy: 90, experience: 15, level: 1, dailyStreak: 2,
  },
  {
    user_id: 'rafter_Ocean', username: 'Ocean', password: 'password1234',
    materials: 50, hunger: 70, raft_size: 3, energy: 75, experience: 120, level: 2, dailyStreak: 5,
  },
  {
    user_id: 'rafter_Rafter', username: 'Rafter', password: 'password12345',
    materials: 200, hunger: 40, raft_size: 8, energy: 45, experience: 480, level: 4, dailyStreak: 12,
  },
];


const sampleItemType = [
  {
    item_name: 'Wood Plank', category: 'material', material_cost: 0, hunger_restore: 0, raft_points: 5,
    description: 'Sun-bleached timber that keeps the raft afloat.', rarity: 'common',
  },
  {
    item_name: 'Plastic', category: 'material', material_cost: 0, hunger_restore: 0, raft_points: 3,
    description: 'Useful scraps rescued from the drifting tide.', rarity: 'common',
  },
  {
    item_name: 'Rope', category: 'material', material_cost: 0, hunger_restore: 0, raft_points: 2,
    description: 'Salt-stiffened rope for tying down precious cargo.', rarity: 'common',
  },
  {
    item_name: 'Grilled Fish', category: 'food', material_cost: 5, hunger_restore: 40, raft_points: 0,
    description: 'A smoky meal that makes another long day at sea possible.', rarity: 'common',
  },
  {
    item_name: 'Coconut', category: 'food', material_cost: 2, hunger_restore: 20, raft_points: 0,
    description: 'A refreshing snack with just enough water to lift your spirits.', rarity: 'common',
  },
  {
    item_name: 'Paddle', category: 'equipment', material_cost: 10, hunger_restore: 0, raft_points: 0,
    description: 'A dependable paddle for steering through calm water.', rarity: 'uncommon',
  },
  {
    item_name: 'Collection Hook', category: 'equipment', material_cost: 15, hunger_restore: 0, raft_points: 0,
    description: 'A hooked pole that snags debris before it drifts away.', rarity: 'uncommon',
  },
  {
    item_name: 'Sea Glass', category: 'material', material_cost: 0, hunger_restore: 0, raft_points: 1,
    description: 'Tide-polished glass that catches the light like a tiny jewel.', rarity: 'rare',
  },
  {
    item_name: 'Treasure Map', category: 'equipment', material_cost: 0, hunger_restore: 0, raft_points: 0,
    description: 'A water-stained map marked with an island that should not exist.', rarity: 'epic',
  },
  {
    item_name: 'Emergency Rations', category: 'food', material_cost: 8, hunger_restore: 55, raft_points: 0,
    description: 'Dense trail food reserved for the most dangerous expeditions.', rarity: 'uncommon',
  },
  {
    item_name: 'Storm Lantern', category: 'equipment', material_cost: 12, hunger_restore: 0, raft_points: 0,
    description: 'A shielded lantern that turns shipwreck searches into calculated risks.', rarity: 'rare',
  },
  {
    item_name: 'Ancient Compass', category: 'equipment', material_cost: 20, hunger_restore: 0, raft_points: 0,
    description: 'Its needle points toward forgotten places instead of north.', rarity: 'legendary',
  },
];


const sampleUserItems = [
  { user_id: 'rafter_SurvivorJay', item_type_id: 1, quantity: 1, acquired_at: '2026-01-10T09:00:00.000Z' },
  { user_id: 'rafter_Ocean', item_type_id: 2, quantity: 2, acquired_at: '2026-01-10T10:00:00.000Z' },
  { user_id: 'rafter_Rafter', item_type_id: 3, quantity: 3, acquired_at: '2026-01-11T08:00:00.000Z' },
  { user_id: 'rafter_Ocean', item_type_id: 4, quantity: 1, acquired_at: '2026-01-12T14:00:00.000Z' },
  { user_id: 'rafter_SurvivorJay', item_type_id: 8, quantity: 2, acquired_at: '2026-01-12T15:00:00.000Z' },
  { user_id: 'rafter_Ocean', item_type_id: 10, quantity: 1, acquired_at: '2026-01-13T11:00:00.000Z' },
  { user_id: 'rafter_Rafter', item_type_id: 9, quantity: 1, acquired_at: '2026-01-13T12:00:00.000Z' },
];

const sampleCraftingRecipes = [
  { result_item_type_id: 4, ingredient_item_type_id: 1, quantity_required: 2 },
  { result_item_type_id: 6, ingredient_item_type_id: 1, quantity_required: 3 },
  { result_item_type_id: 6, ingredient_item_type_id: 3, quantity_required: 1 },
  { result_item_type_id: 7, ingredient_item_type_id: 2, quantity_required: 4 },
  { result_item_type_id: 7, ingredient_item_type_id: 3, quantity_required: 2 },
  { result_item_type_id: 10, ingredient_item_type_id: 4, quantity_required: 1 },
  { result_item_type_id: 10, ingredient_item_type_id: 5, quantity_required: 1 },
  { result_item_type_id: 11, ingredient_item_type_id: 2, quantity_required: 3 },
  { result_item_type_id: 11, ingredient_item_type_id: 3, quantity_required: 1 },
];

const sampleRaftUpgrades = [
  { user_id: 'rafter_SurvivorJay', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-10T09:00:00.000Z' },
  { user_id: 'rafter_Ocean', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-11T10:00:00.000Z' },
  { user_id: 'rafter_Ocean', upgrade_type: 'Sail', material_cost: 20, applied_at: '2026-01-12T12:00:00.000Z' },
  { user_id: 'rafter_Rafter', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-13T08:00:00.000Z' },
  { user_id: 'rafter_Rafter', upgrade_type: 'Sail', material_cost: 20, applied_at: '2026-01-13T09:00:00.000Z' },
  { user_id: 'rafter_Rafter', upgrade_type: 'Net Launcher', material_cost: 35, applied_at: '2026-01-13T10:00:00.000Z' },
];

const sampleQuests = [
  {
    title: 'Debris Diver',
    description: 'Complete three debris sweeps and prove the ocean cannot outlast you.',
    quest_type: 'collect_debris',
    target_value: 3,
    reward_materials: 25,
    min_raft_size: 1,
  },
  {
    title: 'Hot Meal, High Morale',
    description: 'Craft two meals before hunger turns the crew grumpy.',
    quest_type: 'craft_food',
    target_value: 2,
    reward_materials: 35,
    reward_item_type_id: 10,
    reward_item_quantity: 1,
    min_raft_size: 1,
  },
  {
    title: 'Chase the Storm',
    description: 'Survive a dangerous ocean event and bring back a story worth telling.',
    quest_type: 'survive_event',
    target_value: 1,
    reward_materials: 50,
    reward_item_type_id: 11,
    reward_item_quantity: 1,
    min_raft_size: 3,
  },
];

const sampleUserQuests = [
  {
    user_id: 'rafter_SurvivorJay', quest_id: 1, progress: 1, status: 'active',
    assigned_at: '2026-01-14T08:00:00.000Z',
  },
  {
    user_id: 'rafter_Ocean', quest_id: 2, progress: 2, status: 'completed',
    assigned_at: '2026-01-13T08:00:00.000Z', completed_at: '2026-01-14T07:30:00.000Z',
  },
  {
    user_id: 'rafter_Rafter', quest_id: 3, progress: 1, status: 'claimed',
    assigned_at: '2026-01-12T08:00:00.000Z', completed_at: '2026-01-12T17:00:00.000Z', claimed_at: '2026-01-12T17:05:00.000Z',
  },
];

const sampleOceanEvents = [
  {
    event_name: 'Message in a Bottle',
    description: 'A sealed bottle bobs beside the raft. Inside is a hand-drawn treasure map.',
    event_type: 'discovery',
    min_raft_size: 1,
    risk_percent: 0,
    min_materials: 0,
    max_materials: 5,
    hunger_delta: -2,
    reward_item_type_id: 9,
    reward_item_quantity: 1,
  },
  {
    event_name: 'Rogue Wave',
    description: 'A sudden wall of water tears through the debris field and tests every rope knot.',
    event_type: 'hazard',
    min_raft_size: 1,
    risk_percent: 60,
    min_materials: 0,
    max_materials: 0,
    hunger_delta: -15,
  },
  {
    event_name: 'Floating Supply Crate',
    description: 'A battered shipping crate contains enough food to make the next watch easier.',
    event_type: 'supply_cache',
    min_raft_size: 2,
    risk_percent: 10,
    min_materials: 10,
    max_materials: 20,
    hunger_delta: 0,
    reward_item_type_id: 10,
    reward_item_quantity: 1,
  },
  {
    event_name: 'Whirlpool Shortcut',
    description: 'The current offers a shortcut through a spinning funnel, if the raft can hold together.',
    event_type: 'hazard',
    min_raft_size: 4,
    risk_percent: 35,
    min_materials: 20,
    max_materials: 35,
    hunger_delta: -10,
    reward_item_type_id: 8,
    reward_item_quantity: 3,
  },
  {
    event_name: 'Shark Attack',
    description: 'A hungry shark circles the raft and lunges for the food stores.',
    event_type: 'shark_attack',
    is_unexpected: 1,
    min_raft_size: 1,
    risk_percent: 100,
    hunger_delta: -10,
    prevention_upgrade_type: 'Spear Rack',
    loss_item_type_id: 4,
    loss_item_quantity: 1,
    cooldown_seconds: 60,
  },
  {
    event_name: 'Tsunami',
    description: 'A sudden wall of water sweeps across the raft and tears loose unsecured planks.',
    event_type: 'tsunami',
    is_unexpected: 1,
    min_raft_size: 1,
    risk_percent: 100,
    hunger_delta: -15,
    prevention_upgrade_type: 'Shelter',
    loss_item_type_id: 1,
    loss_item_quantity: 2,
    cooldown_seconds: 90,
  },
  {
    event_name: 'Heavy Downpour',
    description: 'Rain lashes the deck until exposed supplies and rope begin to wash overboard.',
    event_type: 'heavy_downpour',
    is_unexpected: 1,
    min_raft_size: 1,
    risk_percent: 100,
    hunger_delta: -5,
    prevention_upgrade_type: 'Roof',
    loss_item_type_id: 3,
    loss_item_quantity: 1,
    cooldown_seconds: 45,
  },
];

const sampleUserEvents = [
  {
    user_id: 'rafter_SurvivorJay', event_id: 1, outcome: 'Recovered a treasure map without losing the bottle.',
    materials_change: 4, hunger_change: -2, reward_item_type_id: 9, reward_item_quantity: 1,
    occurred_at: '2026-01-14T09:00:00.000Z',
  },
  {
    user_id: 'rafter_Ocean', event_id: 3, outcome: 'Pulled the supply crate aboard before it sank.',
    materials_change: 18, hunger_change: 0, reward_item_type_id: 10, reward_item_quantity: 1,
    occurred_at: '2026-01-14T10:00:00.000Z',
  },
  {
    user_id: 'rafter_Rafter', event_id: 4, outcome: 'Threaded the whirlpool and found glittering sea glass in the wake.',
    materials_change: 28, hunger_change: -10, reward_item_type_id: 8, reward_item_quantity: 3,
    occurred_at: '2026-01-14T11:00:00.000Z',
  },
];

// --- Seed function ---

/** Insert seed data into the database. */
export const seed = async (db) => {

  const hashedUsers = await Promise.all(
    sampleUsers.map(async (user) => ({ ...user, password: await bcrypt.hash(user.password, 10) }))
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

  await db.insert(quests).values(sampleQuests);
  console.log(`  Inserted ${sampleQuests.length} quests`);

  await db.insert(user_quests).values(sampleUserQuests);
  console.log(`  Inserted ${sampleUserQuests.length} user_quests`);

  await db.insert(ocean_events).values(sampleOceanEvents);
  console.log(`  Inserted ${sampleOceanEvents.length} ocean_events`);

  await db.insert(user_events).values(sampleUserEvents);
  console.log(`  Inserted ${sampleUserEvents.length} user_events`);

};

// --- Database reset (no need to modify below) ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const dbUrl = process.env.DATABASE_URL || 'file:local.db';
const isFileDatabase = dbUrl.startsWith('file:');

const resetDatabase = async () => {
  try {
    // Step 1 — Delete the old database file
    if (isFileDatabase) {
      const dbPath = dbUrl.slice('file:'.length);
      const absoluteDbPath = path.resolve(projectRoot, dbPath);

      if (fs.existsSync(absoluteDbPath)) {
        fs.unlinkSync(absoluteDbPath);
        console.log(`Deleted old database: ${dbPath}`);
      }
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
