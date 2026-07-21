import {
  users,
  item_types,
  quests,
  user_quests,
  ocean_events,
  user_events,
} from '../../src/db/schema.js';

describe('Castaway Chronicles game feature schema', () => {
  it('stores survivor progression stats for energy and levelling', () => {
    expect(users).toHaveProperty('energy');
    expect(users).toHaveProperty('experience');
    expect(users).toHaveProperty('level');
    expect(users).toHaveProperty('dailyStreak');
  });

  it('stores richer item metadata for exciting loot drops', () => {
    expect(item_types).toHaveProperty('description');
    expect(item_types).toHaveProperty('rarity');
  });

  it('models repeatable quests with per-survivor progress', () => {
    expect(quests).toHaveProperty('quest_id');
    expect(quests).toHaveProperty('target_value');
    expect(quests).toHaveProperty('reward_materials');
    expect(user_quests).toHaveProperty('progress');
    expect(user_quests).toHaveProperty('status');
  });

  it('models ocean events with player history', () => {
    expect(ocean_events).toHaveProperty('risk_percent');
    expect(ocean_events).toHaveProperty('reward_item_type_id');
    expect(user_events).toHaveProperty('outcome');
  });
});
