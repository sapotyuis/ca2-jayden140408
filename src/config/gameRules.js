/**
 * Central game-balance config.
 *
 * Kept out of the controllers so the numbers that define the game can be tuned in one
 * place, and so route validation and controller logic can never disagree about which
 * upgrade types exist.
 */

/** Material cost and raft_size gained for each raft upgrade. */
export const UPGRADE_SPECS = {
  'Floor Extension': { material_cost: 10, raft_size_gain: 1, repeatable: true },
  'Sail': { material_cost: 20, raft_size_gain: 2, repeatable: true },
  'Net Launcher': { material_cost: 35, raft_size_gain: 3, repeatable: true },
  'Spear Rack': { material_cost: 30, raft_size_gain: 0, repeatable: false },
  'Shelter': { material_cost: 45, raft_size_gain: 0, repeatable: false },
  'Roof': { material_cost: 35, raft_size_gain: 0, repeatable: false },
};

// Derived from UPGRADE_SPECS so the valid list can never drift from the cost table above.
export const VALID_UPGRADE_TYPES = Object.keys(UPGRADE_SPECS);
