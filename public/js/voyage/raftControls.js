// Calculates smooth raft acceleration, reversing, steering, and turning during the voyage.
export const RAFT_MAX_SPEED = 11;
const RAFT_REVERSE_SPEED = 4.5;
const RAFT_TURN_SPEED = 1.65;

const SPEED_RESPONSE = 4.2;
const STEERING_RESPONSE = 8;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const easeToward = (current, target, response, dt) => {
  const blend = 1 - Math.exp(-response * Math.max(0, dt));
  return current + (target - current) * blend;
};

/**
 * Advances the raft's speed and steering toward the current input without frame-sized jumps.
 * `throttle` and `turn` are expected to be in the range -1..1.
 */
export const stepRaftMotion = ({ speed = 0, heading = 0, steering = 0 }, { throttle = 0, turn = 0 }, dt) => {
  const nextThrottle = clamp(throttle, -1, 1);
  const nextTurn = clamp(turn, -1, 1);
  const targetSpeed = nextThrottle >= 0
    ? nextThrottle * RAFT_MAX_SPEED
    : nextThrottle * RAFT_REVERSE_SPEED;
  const nextSpeed = easeToward(speed, targetSpeed, SPEED_RESPONSE, dt);
  const nextSteering = easeToward(steering, nextTurn, STEERING_RESPONSE, dt);
  const speedRatio = clamp(Math.abs(nextSpeed) / RAFT_MAX_SPEED, 0, 1);
  const turnScale = 0.45 + speedRatio * 0.55;

  return {
    speed: nextSpeed,
    heading: heading + nextSteering * RAFT_TURN_SPEED * turnScale * Math.max(0, dt),
    steering: nextSteering,
  };
};
