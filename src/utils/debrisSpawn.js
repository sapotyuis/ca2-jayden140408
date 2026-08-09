/**
 * How far from the origin salvage may spawn.
 *
 * This must stay comfortably inside the renderer's WORLD_LIMIT (frontend/js/ocean/
 * createPixelOceanScene.js). The raft collects with its deck, which sits ahead of the hull, so a
 * piece spawned right on the edge of the sailable area could never be driven over. The renderer
 * currently sails to +/-180, which leaves this radius roughly 20 units of slack.
 */
export const DEBRIS_FIELD_RADIUS = 160;

/**
 * Salvage is spread over concentric rings rather than a small cluster near the origin, so a
 * voyage means actually sailing somewhere. Wider rings carry more positions to keep the density
 * of the field roughly even instead of bunching everything in the middle.
 */
const buildSpawnField = (radius) => {
  const positions = [];
  const rings = [0.22, 0.48, 0.72, 0.95];

  rings.forEach((spread, ringIndex) => {
    const count = 6 + ringIndex * 4;
    for (let step = 0; step < count; step += 1) {
      // The per-ring offset stops the rings lining up into spokes.
      const angle = (step / count) * Math.PI * 2 + ringIndex * 0.4;
      positions.push([
        Math.round(Math.cos(angle) * radius * spread),
        Math.round(Math.sin(angle) * radius * spread),
      ]);
    }
  });

  return positions;
};

export const DEBRIS_SPAWN_POSITIONS = buildSpawnField(DEBRIS_FIELD_RADIUS);

export const STARTER_DEBRIS_ITEMS = ['Wood Plank', 'Plastic', 'Rope', 'Paddle', 'Collection Hook'];

const positionKey = ([x, z]) => `${x}:${z}`;

export const chooseDebrisSpawnPosition = ({
  activePositions = [],
  recentlyClaimedPositions = [],
  positions = DEBRIS_SPAWN_POSITIONS,
  random = () => 0,
}) => {
  const blocked = new Set([
    ...activePositions,
    ...recentlyClaimedPositions,
  ].map(positionKey));
  const available = positions.filter((position) => !blocked.has(positionKey(position)));
  const pool = available.length ? available : positions;
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return pool[Math.min(pool.length - 1, Math.floor(value * pool.length))];
};

export const chooseStarterItemName = ({
  recentlyClaimedItemName,
  activeCount = 0,
}) => {
  const lastIndex = STARTER_DEBRIS_ITEMS.indexOf(recentlyClaimedItemName);
  const nextIndex = lastIndex >= 0
    ? (lastIndex + 1) % STARTER_DEBRIS_ITEMS.length
    : activeCount % STARTER_DEBRIS_ITEMS.length;
  return STARTER_DEBRIS_ITEMS[nextIndex];
};
