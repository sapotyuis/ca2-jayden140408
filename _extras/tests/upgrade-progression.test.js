import {
  countUpgradeTypes,
  getNextRecommendedUpgrade,
} from '../../src/utils/upgradeProgress.js';

describe('repeatable raft upgrade progression', () => {
  it('counts repeated purchases instead of collapsing them into one installed flag', () => {
    expect(countUpgradeTypes(['Floor Extension', 'Floor Extension', 'Sail'])).toEqual({
      'Floor Extension': 2,
      Sail: 1,
    });
  });

  it('still recommends a missing defense even after repeatable growth upgrades', () => {
    expect(getNextRecommendedUpgrade(['Floor Extension', 'Floor Extension'])).toBe('Spear Rack');
  });

  it('still recommends a repeatable floor upgrade after every defense is installed', () => {
    expect(getNextRecommendedUpgrade([
      'Floor Extension',
      'Spear Rack',
      'Shelter',
      'Roof',
    ])).toBe('Floor Extension');
  });
});
