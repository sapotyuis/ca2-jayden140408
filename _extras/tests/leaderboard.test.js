import { rankSurvivors } from '../../public/js/lib/leaderboard.js';

describe('rankSurvivors', () => {
  it('ranks by raft size, then materials, then username', () => {
    const survivors = [
      { username: 'Drift', raft_size: 3, materials: 80 },
      { username: 'Current', raft_size: 4, materials: 10 },
      { username: 'Beacon', raft_size: 3, materials: 80 },
      { username: 'Anchor', raft_size: 3, materials: 95 },
    ];

    expect(rankSurvivors(survivors).map((survivor) => survivor.username)).toEqual([
      'Current',
      'Anchor',
      'Beacon',
      'Drift',
    ]);
  });

  it('does not mutate the API response and handles an empty roster', () => {
    const survivors = [{ username: 'Solo', raft_size: 1, materials: 0 }];

    expect(rankSurvivors(survivors)).not.toBe(survivors);
    expect(rankSurvivors([])).toEqual([]);
  });

  it('caps the ranked result at the requested leaderboard size', () => {
    const survivors = Array.from({ length: 7 }, (_, index) => ({
      username: `Survivor${index + 1}`,
      raft_size: index + 1,
      materials: 0,
    }));

    expect(rankSurvivors(survivors, 5).map((survivor) => survivor.username)).toEqual([
      'Survivor7',
      'Survivor6',
      'Survivor5',
      'Survivor4',
      'Survivor3',
    ]);
  });
});
