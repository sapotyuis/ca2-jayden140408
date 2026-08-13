import { describe, expect, it } from 'vitest';
import { RAFT_MAX_SPEED, stepRaftMotion } from '../../public/js/ocean/raftMotion.js';

describe('raft motion', () => {
  it('accelerates and coasts smoothly instead of changing speed instantly', () => {
    const launched = stepRaftMotion({ speed: 0, heading: 0, steering: 0 }, { throttle: 1, turn: 0 }, 0.1);
    expect(launched.speed).toBeGreaterThan(0);
    expect(launched.speed).toBeLessThan(RAFT_MAX_SPEED);

    const coasting = stepRaftMotion(launched, { throttle: 0, turn: 0 }, 0.1);
    expect(coasting.speed).toBeGreaterThan(0);
    expect(coasting.speed).toBeLessThan(launched.speed);
  });

  it('eases steering in and out', () => {
    const turning = stepRaftMotion({ speed: 5, heading: 0, steering: 0 }, { throttle: 1, turn: 1 }, 0.1);
    expect(turning.steering).toBeGreaterThan(0);
    expect(turning.steering).toBeLessThan(1);
    expect(turning.heading).toBeGreaterThan(0);

    const released = stepRaftMotion(turning, { throttle: 1, turn: 0 }, 0.1);
    expect(released.steering).toBeGreaterThan(0);
    expect(released.steering).toBeLessThan(turning.steering);
  });
});
