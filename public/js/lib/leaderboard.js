// Sorts, ranks, and limits survivor data for the public leaderboard.
const numericStat = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const LEADERBOARD_LIMIT = 5;

/** Return a display-safe, ranked copy of the public survivor roster. */
export const rankSurvivors = (survivors = [], limit) => {
  const ranked = survivors
  .map((survivor, index) => ({
    ...survivor,
    raft_size: numericStat(survivor?.raft_size),
    materials: numericStat(survivor?.materials),
    _sourceIndex: index,
  }))
  .sort((left, right) => {
    if (right.raft_size !== left.raft_size) return right.raft_size - left.raft_size;
    if (right.materials !== left.materials) return right.materials - left.materials;

    const leftName = String(left.username || '').toLocaleLowerCase();
    const rightName = String(right.username || '').toLocaleLowerCase();
    return leftName.localeCompare(rightName) || left._sourceIndex - right._sourceIndex;
  })
  .map(({ _sourceIndex, ...survivor }) => survivor);

  if (!Number.isInteger(limit) || limit < 0) return ranked;
  return ranked.slice(0, limit);
};
