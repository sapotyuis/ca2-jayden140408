import { describe, expect, it } from 'vitest';
import { DEBRIS_FIELD_RADIUS, DEBRIS_SPAWN_POSITIONS, chooseDebrisSpawnPosition, chooseStarterItemName } from '../../src/utils/debrisSpawn.js';

// An explicit field keeps these cases about the skip-blocked-positions logic rather than about
// whichever coordinates the live spawn field happens to be balanced to.
const FIELD = [[-10, 4], [-4, -12], [8, 7], [14, -5], [2, 15], [-18, -10]];

describe('server debris spawning', () => {
  it('does not respawn a replacement at the recently collected position', () => {
    const position = chooseDebrisSpawnPosition({
      positions: FIELD,
      activePositions: [[-10, 4], [-4, -12], [8, 7], [14, -5]],
      recentlyClaimedPositions: [[2, 15]],
      random: () => 0,
    });

    expect(position).toEqual([-18, -10]);
  });

  it('does not duplicate an active debris position', () => {
    const position = chooseDebrisSpawnPosition({
      positions: FIELD,
      activePositions: [[-10, 4], [-4, -12]],
      random: () => 0,
    });

    expect(position).toEqual([8, 7]);
  });

  it('spreads the live spawn field across the ocean instead of clustering at the origin', () => {
    const distances = DEBRIS_SPAWN_POSITIONS.map(([x, z]) => Math.hypot(x, z));
    const furthest = Math.max(...distances);

    expect(DEBRIS_SPAWN_POSITIONS.length).toBeGreaterThanOrEqual(40);
    // Every position has to stay inside the field radius, which in turn stays inside the
    // renderer's sailable limit — otherwise salvage spawns where the raft can never reach it.
    expect(furthest).toBeLessThanOrEqual(DEBRIS_FIELD_RADIUS);
    // At least a third of the field sits out in the far half of the ocean.
    expect(distances.filter((d) => d > DEBRIS_FIELD_RADIUS / 2).length / distances.length).toBeGreaterThan(0.33);
  });

  it('cycles to the next starter item after a collection', () => {
    expect(chooseStarterItemName({ recentlyClaimedItemName: 'Collection Hook' })).toBe('Wood Plank');
    expect(chooseStarterItemName({ recentlyClaimedItemName: 'Wood Plank' })).toBe('Plastic');
    expect(chooseStarterItemName({ activeCount: 4 })).toBe('Collection Hook');
  });
});
