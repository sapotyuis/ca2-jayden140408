// ✏️ EDIT THIS FILE — add seed data for your own tables below the example tasks.

/**
 * Seed data and database reset script. Run with: npm run db
 *
 * To add your own seed data:
 *   1. Import your table schema from './schema.js'
 *   2. Add a sample data array
 *   3. Insert it inside the seed() function with db.insert()
 */

import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

// Import your table schemas here
import {
  users,
  item_types,
  user_items,
  debris,
  debris_collection_logs,
  crafting_recipes,
  raft_upgrades,
  quests,
  user_quests,
  ocean_events,
  user_events,
} from './schema.js';

// --- Seed data ---

// Primary keys are intentionally omitted. Seed relationships are resolved from the IDs returned
// by each insert, so repeated resets work even when SQLite's autoincrement counters keep growing.
const sampleUsers = [
  {
    username: 'SurvivorJay', password: 'password123',
    materials: 0, raft_size: 1, energy: 90, experience: 15, level: 1, dailyStreak: 2,
  },
  {
    username: 'Ocean', password: 'password1234',
    materials: 50, raft_size: 3, energy: 75, experience: 120, level: 2, dailyStreak: 5,
  },
  {
    username: 'Rafter', password: 'password12345',
    materials: 200, raft_size: 8, energy: 45, experience: 480, level: 4, dailyStreak: 12,
  },
];

const sampleItemType = [
  {
    item_name: 'Wood Plank', category: 'material', material_cost: 0, raft_points: 5,
    description: 'Sun-bleached timber that keeps the raft afloat.', rarity: 'common',
  },
  {
    item_name: 'Plastic', category: 'material', material_cost: 0, raft_points: 3,
    description: 'Useful scraps rescued from the drifting tide.', rarity: 'common',
  },
  {
    item_name: 'Rope', category: 'material', material_cost: 0, raft_points: 2,
    description: 'Salt-stiffened rope for tying down precious cargo.', rarity: 'common',
  },
  {
    item_name: 'Paddle', category: 'equipment', material_cost: 10, raft_points: 0,
    description: 'A dependable paddle for steering through calm water.', rarity: 'uncommon',
  },
  {
    item_name: 'Collection Hook', category: 'equipment', material_cost: 15, raft_points: 0,
    description: 'A hooked pole that snags debris before it drifts away.', rarity: 'uncommon',
  },
  {
    item_name: 'Sea Glass', category: 'material', material_cost: 0, raft_points: 1,
    description: 'Tide-polished glass that catches the light like a tiny jewel.', rarity: 'rare',
  },
  {
    item_name: 'Treasure Map', category: 'equipment', material_cost: 0, raft_points: 0,
    description: 'A water-stained map marked with an island that should not exist.', rarity: 'epic',
  },
  {
    item_name: 'Storm Lantern', category: 'equipment', material_cost: 12, raft_points: 0,
    description: 'A shielded lantern that turns shipwreck searches into calculated risks.', rarity: 'rare',
  },
  {
    item_name: 'Ancient Compass', category: 'equipment', material_cost: 20, raft_points: 0,
    description: 'Its needle points toward forgotten places instead of north.', rarity: 'legendary',
  },
];


const sampleUserItems = [
  { username: 'SurvivorJay', item_name: 'Wood Plank', quantity: 1, acquired_at: '2026-01-10T09:00:00.000Z' },
  { username: 'Ocean', item_name: 'Plastic', quantity: 2, acquired_at: '2026-01-10T10:00:00.000Z' },
  { username: 'Rafter', item_name: 'Rope', quantity: 3, acquired_at: '2026-01-11T08:00:00.000Z' },
  { username: 'SurvivorJay', item_name: 'Sea Glass', quantity: 2, acquired_at: '2026-01-12T15:00:00.000Z' },
  { username: 'Rafter', item_name: 'Treasure Map', quantity: 1, acquired_at: '2026-01-13T12:00:00.000Z' },
];

const sampleCraftingRecipes = [
  { result_item_name: 'Paddle', ingredient_item_name: 'Wood Plank', quantity_required: 3 },
  { result_item_name: 'Paddle', ingredient_item_name: 'Rope', quantity_required: 1 },
  { result_item_name: 'Collection Hook', ingredient_item_name: 'Plastic', quantity_required: 4 },
  { result_item_name: 'Collection Hook', ingredient_item_name: 'Rope', quantity_required: 2 },
  { result_item_name: 'Storm Lantern', ingredient_item_name: 'Plastic', quantity_required: 3 },
  { result_item_name: 'Storm Lantern', ingredient_item_name: 'Rope', quantity_required: 1 },
];

const sampleRaftUpgrades = [
  { username: 'SurvivorJay', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-10T09:00:00.000Z' },
  { username: 'Ocean', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-11T10:00:00.000Z' },
  { username: 'Ocean', upgrade_type: 'Sail', material_cost: 20, applied_at: '2026-01-12T12:00:00.000Z' },
  { username: 'Rafter', upgrade_type: 'Floor Extension', material_cost: 10, applied_at: '2026-01-13T08:00:00.000Z' },
  { username: 'Rafter', upgrade_type: 'Sail', material_cost: 20, applied_at: '2026-01-13T09:00:00.000Z' },
  { username: 'Rafter', upgrade_type: 'Net Launcher', material_cost: 35, applied_at: '2026-01-13T10:00:00.000Z' },
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
    title: 'Chase the Storm',
    description: 'Survive a dangerous ocean event and bring back a story worth telling.',
    quest_type: 'survive_event',
    target_value: 1,
    reward_materials: 50,
    reward_item_name: 'Storm Lantern',
    reward_item_quantity: 1,
    min_raft_size: 3,
  },
];

const sampleUserQuests = [
  {
    username: 'SurvivorJay', quest_title: 'Debris Diver', progress: 1, status: 'active',
    assigned_at: '2026-01-14T08:00:00.000Z',
  },
  {
    username: 'Rafter', quest_title: 'Chase the Storm', progress: 1, status: 'claimed',
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
    reward_item_name: 'Treasure Map',
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
  },
  {
    event_name: 'Floating Supply Crate',
    description: 'A battered shipping crate contains useful salvage for the next watch.',
    event_type: 'supply_cache',
    min_raft_size: 2,
    risk_percent: 10,
    min_materials: 10,
    max_materials: 20,
    reward_item_quantity: 0,
  },
  {
    event_name: 'Whirlpool Shortcut',
    description: 'The current offers a shortcut through a spinning funnel, if the raft can hold together.',
    event_type: 'hazard',
    min_raft_size: 4,
    risk_percent: 35,
    min_materials: 20,
    max_materials: 35,
    reward_item_name: 'Sea Glass',
    reward_item_quantity: 3,
  },
  {
    event_name: 'Shark Attack',
    description: 'A hungry shark circles the raft and lunges for loose planks.',
    event_type: 'shark_attack',
    is_unexpected: 1,
    min_raft_size: 1,
    risk_percent: 100,
    prevention_upgrade_type: 'Spear Rack',
    loss_item_name: 'Wood Plank',
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
    prevention_upgrade_type: 'Shelter',
    loss_item_name: 'Wood Plank',
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
    prevention_upgrade_type: 'Roof',
    loss_item_name: 'Rope',
    loss_item_quantity: 1,
    cooldown_seconds: 45,
  },
];

const sampleUserEvents = [
  {
    username: 'SurvivorJay', event_name: 'Message in a Bottle', outcome: 'Recovered a treasure map without losing the bottle.',
    materials_change: 4, reward_item_name: 'Treasure Map', reward_item_quantity: 1,
    occurred_at: '2026-01-14T09:00:00.000Z',
  },
  {
    username: 'Ocean', event_name: 'Floating Supply Crate', outcome: 'Pulled the supply crate aboard before it sank.',
    materials_change: 18, reward_item_name: 'Plastic', reward_item_quantity: 1,
    occurred_at: '2026-01-14T10:00:00.000Z',
  },
  {
    username: 'Rafter', event_name: 'Whirlpool Shortcut', outcome: 'Threaded the whirlpool and found glittering sea glass in the wake.',
    materials_change: 28, reward_item_name: 'Sea Glass', reward_item_quantity: 3,
    occurred_at: '2026-01-14T11:00:00.000Z',
  },
];

// --- Seed function ---

const resolveSeedId = (index, key, label) => {
  const id = index.get(key);
  if (id === undefined) throw new Error(`Seed reference not found: ${label} "${key}"`);
  return id;
};

const seedData = async (db) => {
  const hashedUsers = await Promise.all(
    sampleUsers.map(async (user) => ({ ...user, password: await bcrypt.hash(user.password, 10) }))
  );
  const insertedUsers = await db.insert(users).values(hashedUsers).returning({ user_id: users.user_id, username: users.username });
  const userIdByUsername = new Map(insertedUsers.map(({ user_id, username }) => [username, user_id]));
  console.log(`  Inserted ${sampleUsers.length} users`);

  const insertedItemTypes = await db.insert(item_types).values(sampleItemType).returning({ item_type_id: item_types.item_type_id, item_name: item_types.item_name });
  const itemTypeIdByName = new Map(insertedItemTypes.map(({ item_type_id, item_name }) => [item_name, item_type_id]));
  console.log(`  Inserted ${sampleItemType.length} item_types`);

  const userItemRows = sampleUserItems.map(({ username, item_name, ...row }) => ({
    ...row,
    user_id: resolveSeedId(userIdByUsername, username, 'user'),
    item_type_id: resolveSeedId(itemTypeIdByName, item_name, 'item type'),
  }));
  await db.insert(user_items).values(userItemRows);
  console.log(`  Inserted ${userItemRows.length} user_items`);

  const recipeRows = sampleCraftingRecipes.map(({ result_item_name, ingredient_item_name, ...row }) => ({
    ...row,
    result_item_type_id: resolveSeedId(itemTypeIdByName, result_item_name, 'recipe result item'),
    ingredient_item_type_id: resolveSeedId(itemTypeIdByName, ingredient_item_name, 'recipe ingredient item'),
  }));
  await db.insert(crafting_recipes).values(recipeRows);
  console.log(`  Inserted ${recipeRows.length} crafting_recipes`);

  const upgradeRows = sampleRaftUpgrades.map(({ username, ...row }) => ({
    ...row,
    user_id: resolveSeedId(userIdByUsername, username, 'user'),
  }));
  await db.insert(raft_upgrades).values(upgradeRows);
  console.log(`  Inserted ${upgradeRows.length} raft_upgrades`);

  const questRows = sampleQuests.map(({ reward_item_name, ...row }) => ({
    ...row,
    ...(reward_item_name ? { reward_item_type_id: resolveSeedId(itemTypeIdByName, reward_item_name, 'quest reward item') } : {}),
  }));
  const insertedQuests = await db.insert(quests).values(questRows).returning({ quest_id: quests.quest_id, title: quests.title });
  const questIdByTitle = new Map(insertedQuests.map(({ quest_id, title }) => [title, quest_id]));
  console.log(`  Inserted ${questRows.length} quests`);

  const userQuestRows = sampleUserQuests.map(({ username, quest_title, ...row }) => ({
    ...row,
    user_id: resolveSeedId(userIdByUsername, username, 'user'),
    quest_id: resolveSeedId(questIdByTitle, quest_title, 'quest'),
  }));
  await db.insert(user_quests).values(userQuestRows);
  console.log(`  Inserted ${userQuestRows.length} user_quests`);

  const eventRows = sampleOceanEvents.map(({ reward_item_name, loss_item_name, ...row }) => ({
    ...row,
    ...(reward_item_name ? { reward_item_type_id: resolveSeedId(itemTypeIdByName, reward_item_name, 'event reward item') } : {}),
    ...(loss_item_name ? { loss_item_type_id: resolveSeedId(itemTypeIdByName, loss_item_name, 'event loss item') } : {}),
  }));
  const insertedEvents = await db.insert(ocean_events).values(eventRows).returning({ event_id: ocean_events.event_id, event_name: ocean_events.event_name });
  const eventIdByName = new Map(insertedEvents.map(({ event_id, event_name }) => [event_name, event_id]));
  console.log(`  Inserted ${eventRows.length} ocean_events`);

  const userEventRows = sampleUserEvents.map(({ username, event_name, reward_item_name, ...row }) => ({
    ...row,
    user_id: resolveSeedId(userIdByUsername, username, 'user'),
    event_id: resolveSeedId(eventIdByName, event_name, 'event'),
    ...(reward_item_name ? { reward_item_type_id: resolveSeedId(itemTypeIdByName, reward_item_name, 'event history reward item') } : {}),
  }));
  await db.insert(user_events).values(userEventRows);
  console.log(`  Inserted ${userEventRows.length} user_events`);
};

/** Insert seed data in a transaction when called independently. */
export const seed = async (db) => db.transaction((tx) => seedData(tx));

// --- Database reset (no need to modify below) ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const dbUrl = process.env.DATABASE_URL || 'file:local.db';
const isFileDatabase = dbUrl.startsWith('file:');

// Clear rows in dependency order without replacing the database file. Replacing local.db while
// the API is running leaves the process attached to the old inode and produces SQLITE_READONLY_DBMOVED.
export const clearLocalDatabase = async (db) => {
  const tables = [
    'user_events',
    'debris_collection_logs',
    'debris',
    'user_quests',
    'raft_upgrades',
    'user_items',
    'users',
    'crafting_recipes',
    'ocean_events',
    'quests',
    'item_types',
  ];

  for (const table of tables) {
    await db.run(sql.raw(`DELETE FROM ${table}`));
  }
};

const resetDatabase = async () => {
  try {
    // Step 1 — Create or update tables in place.
    console.log('Creating tables from schema...');
    execSync('npx drizzle-kit push', {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    // Step 2 — Clear and seed in one transaction so a failed seed rolls back completely.
    const { db } = await import('./connection.js');
    console.log(`Clearing ${isFileDatabase ? 'local' : 'configured remote'} database in place...`);
    await db.transaction(async (tx) => {
      await clearLocalDatabase(tx);

      // Step 3 — Insert seed data
      console.log('Seeding database...');
      await seedData(tx);
    });

    console.log('Done! Database is ready.');
  } catch (error) {
    console.error('Failed to reset database:', error.message);
    process.exit(1);
  }
};

resetDatabase();
