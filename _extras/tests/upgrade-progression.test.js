import {
  countUpgradeTypes,
  canPurchaseUpgrade,
  getNextRecommendedUpgrade,
} from '../../src/utils/upgradeProgress.js';
import { UPGRADE_SPECS } from '../../src/config/gameRules.js';

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

  it('allows repeatable growth upgrades to be purchased again', () => {
    expect(UPGRADE_SPECS['Floor Extension'].repeatable).toBe(true);
    expect(canPurchaseUpgrade('Floor Extension', ['Floor Extension'])).toBe(true);
  });

  it('allows each defense only once', () => {
    expect(UPGRADE_SPECS['Spear Rack'].repeatable).toBe(false);
    expect(canPurchaseUpgrade('Spear Rack', ['Spear Rack'])).toBe(false);
  });
});
