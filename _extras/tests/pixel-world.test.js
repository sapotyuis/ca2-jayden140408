import { describe, expect, it } from 'vitest';
import { clampWorldPosition, findNearestWorldItem, findWorldItemAtPixel, pixelToWorldTarget, pushPixelPointOutsideBounds, stepPixelMotion, worldToPixel } from '../../frontend/js/ocean/pixelWorld.js';

describe('pixel voyage world helpers', () => {
  it('keeps the raft inside the playable pixel-water bounds', () => {
    expect(clampWorldPosition({ x: 99, z: -99 }, 42)).toEqual({ x: 42, z: -42 });
  });

  it('moves using integer-friendly top-down coordinates', () => {
    const next = stepPixelMotion({ x: 0, z: 0 }, { x: 1, z: -1 }, 0.5, 12, 42);
    expect(next).toEqual({ x: 6, z: -6 });
  });

  it('maps world coordinates to the fixed logical canvas without fractional pixels', () => {
    expect(worldToPixel({ x: 8.6, z: -4.2 }, { x: 2, z: -1 }, 2, 160, 90)).toEqual({ x: 93, y: 38 });
  });

  it('turns a released click into a persistent world-space sailing destination', () => {
    expect(pixelToWorldTarget({ x: 140, y: 98 }, { x: 0, z: 0 }, { x: 160, y: 90 }, 2, 42)).toEqual({ x: -10, z: 4 });
  });

  it('finds a visible debris item under a pixel click', () => {
    const item = { debrisId: 'wood-1', position: { x: -10, z: 4 } };
    expect(findWorldItemAtPixel({ x: 141, y: 99 }, [item], { x: 0, z: 0 }, 2, 320, 180, 8)).toBe(item);
  });

  it('only offers collection for the nearest item inside the interaction radius', () => {
    const near = { debrisId: 'near', position: { x: 2, z: 1 } };
    const far = { debrisId: 'far', position: { x: 7, z: 0 } };
    expect(findNearestWorldItem({ x: 0, z: 0 }, [far, near], 4)).toBe(near);
    expect(findNearestWorldItem({ x: 0, z: 0 }, [far], 4)).toBeNull();
  });

  it('keeps a collectible marker outside the raft deck bounds', () => {
    expect(pushPixelPointOutsideBounds({ x: 164, y: 120 }, { left: 76, right: 244, top: 114, bottom: 160 }, 12, { x: 160, y: 90 })).toEqual({ x: 164, y: 172 });
  });
});
