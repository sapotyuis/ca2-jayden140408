import { describe, expect, it } from 'vitest';
import { chooseDebrisSpawnPosition, chooseStarterItemName } from '../../src/utils/debrisSpawn.js';

describe('server debris spawning', () => {
  it('does not respawn a replacement at the recently collected position', () => {
    const position = chooseDebrisSpawnPosition({
      activePositions: [[-10, 4], [-4, -12], [8, 7], [14, -5]],
      recentlyClaimedPositions: [[2, 15]],
      random: () => 0,
    });

    expect(position).toEqual([-18, -10]);
  });

  it('does not duplicate an active debris position', () => {
    const position = chooseDebrisSpawnPosition({
      activePositions: [[-10, 4], [-4, -12]],
      random: () => 0,
    });

    expect(position).toEqual([8, 7]);
  });

  it('cycles to the next starter item after a collection', () => {
    expect(chooseStarterItemName({ recentlyClaimedItemName: 'Coconut' })).toBe('Wood Plank');
    expect(chooseStarterItemName({ recentlyClaimedItemName: 'Wood Plank' })).toBe('Plastic');
    expect(chooseStarterItemName({ activeCount: 4 })).toBe('Coconut');
  });
});
