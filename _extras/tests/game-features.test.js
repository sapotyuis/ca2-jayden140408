import {
  users,
  item_types,
  quests,
  user_quests,
  ocean_events,
  user_events,
  debris,
  debris_collection_logs,
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
    expect(ocean_events).toHaveProperty('is_unexpected');
    expect(ocean_events).toHaveProperty('prevention_upgrade_type');
    expect(ocean_events).toHaveProperty('loss_item_type_id');
    expect(ocean_events).toHaveProperty('loss_item_quantity');
    expect(ocean_events).toHaveProperty('cooldown_seconds');
    expect(user_events).toHaveProperty('outcome');
    expect(user_events).toHaveProperty('prevented');
    expect(user_events).toHaveProperty('lost_item_type_id');
    expect(user_events).toHaveProperty('lost_item_quantity');
    expect(user_events).toHaveProperty('protection_upgrade_type');
  });

  it('records server-side debris collection attempts for audit review', () => {
    expect(debris_collection_logs).toHaveProperty('collection_log_id');
    expect(debris_collection_logs).toHaveProperty('user_id');
    expect(debris_collection_logs).toHaveProperty('result');
    expect(debris_collection_logs).toHaveProperty('attempted_at');
  });

  it('models server-owned debris with a one-time claim state and world position', () => {
    expect(debris).toHaveProperty('debris_id');
    expect(debris.debris_id.dataType).toBe('number');
    expect(debris.debris_id.autoIncrement).toBe(true);
    expect(debris_collection_logs.debris_id.dataType).toBe('number');
    expect(debris).toHaveProperty('user_id');
    expect(debris).toHaveProperty('item_type_id');
    expect(debris).toHaveProperty('x_position');
    expect(debris).toHaveProperty('z_position');
    expect(debris).toHaveProperty('claimed_at');
  });
});
