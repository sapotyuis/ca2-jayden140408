/**
 * Central game-balance config.
 *
 * Kept out of the controllers so the numbers that define the game can be tuned in one
 * place, and so route validation and controller logic can never disagree about which
 * upgrade types exist.
 */

/** Material cost and raft_size gained for each raft upgrade. */
export const UPGRADE_SPECS = {
  'Floor Extension': { material_cost: 10, raft_size_gain: 1 },
  'Sail': { material_cost: 20, raft_size_gain: 2 },
  'Net Launcher': { material_cost: 35, raft_size_gain: 3 },
};

// Derived from UPGRADE_SPECS so the valid list can never drift from the cost table above.
export const VALID_UPGRADE_TYPES = Object.keys(UPGRADE_SPECS);
