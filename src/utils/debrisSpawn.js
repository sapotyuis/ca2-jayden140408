export const DEBRIS_SPAWN_POSITIONS = [
  [-10, 4],
  [-4, -12],
  [8, 7],
  [14, -5],
  [2, 15],
  [-18, -10],
  [20, 11],
  [-16, 16],
  [18, -17],
  [0, -22],
  [-22, 0],
  [22, 0],
];

export const STARTER_DEBRIS_ITEMS = ['Wood Plank', 'Plastic', 'Rope', 'Grilled Fish', 'Coconut'];

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
