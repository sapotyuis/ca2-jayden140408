import { describe, expect, it } from 'vitest';
import { getFirstPersonLookTarget } from '../../frontend/src/ocean/firstPersonCamera.js';

describe('first-person survivor camera', () => {
  it('looks forward from the survivor eye anchor at the raft heading', () => {
    const eye = { x: 1.2, y: 1.9, z: -0.4 };
    const target = getFirstPersonLookTarget(eye, 0);

    expect(target.x).toBeCloseTo(eye.x);
    expect(target.y).toBeCloseTo(eye.y);
    expect(target.z).toBeGreaterThan(eye.z);
  });

  it('combines raft heading and mouse look without moving the eye anchor', () => {
    const eye = { x: -2, y: 2.1, z: 4 };
    const target = getFirstPersonLookTarget(eye, Math.PI / 2, 0.2, -0.1);

    expect(target.x).toBeGreaterThan(eye.x);
    expect(target.y).toBeLessThan(eye.y);
    expect(target.z).toBeLessThan(eye.z);
  });
});
