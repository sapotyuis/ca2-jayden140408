import { UPGRADE_SPECS, VALID_UPGRADE_TYPES } from '../config/gameRules.js';

/** Count upgrade history without losing repeated purchases. */
export const countUpgradeTypes = (upgradeTypes = []) => {
  const counts = {};
  for (const upgradeType of upgradeTypes || []) {
    counts[upgradeType] = (counts[upgradeType] || 0) + 1;
  }
  return counts;
};

/** Whether a requested upgrade is still purchasable for this survivor. */
export const canPurchaseUpgrade = (upgradeType, upgradeTypes = []) => {
  const spec = UPGRADE_SPECS[upgradeType];
  return Boolean(spec && (spec.repeatable || !upgradeTypes.includes(upgradeType)));
};

/**
 * Recommend a missing one-time defense first, then keep the raft expandable forever.
 * Repeatable upgrades remain purchasable through the upgrade panel regardless of history.
 */
export const getNextRecommendedUpgrade = (upgradeTypes = []) => {
  const counts = countUpgradeTypes(upgradeTypes);
  const missingDefense = VALID_UPGRADE_TYPES.find(
    (upgradeType) => !UPGRADE_SPECS[upgradeType].repeatable && !counts[upgradeType]
  );

  return missingDefense || 'Floor Extension';
};
