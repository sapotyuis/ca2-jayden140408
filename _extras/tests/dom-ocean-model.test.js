import { describe, expect, it } from 'vitest';
import {
  REFERENCE_OCEAN_BANDS,
  getHeroRaftLayout,
  getReferenceRaftProps,
  getReferenceClusterLayout,
  getCinematicKind,
  getDebrisRenderKind,
  getWorldMotionClass,
  worldToCss,
} from '../../public/js/ocean/domOceanModel.js';

describe('DOM ocean world model', () => {
  it('maps the camera centre to the centre of the DOM viewport', () => {
    expect(worldToCss({ x: 0, z: 0 }, { x: 0, z: 0 }, { width: 480, height: 270, scale: 2 })).toEqual({
      left: 50,
      top: 50,
    });
  });

  it('keeps world positions inside the visible DOM bounds', () => {
    const result = worldToCss({ x: 999, z: -999 }, { x: 0, z: 0 }, { width: 480, height: 270, scale: 2 });
    expect(result.left).toBeGreaterThanOrEqual(-10);
    expect(result.left).toBeLessThanOrEqual(110);
    expect(result.top).toBeGreaterThanOrEqual(-10);
    expect(result.top).toBeLessThanOrEqual(110);
  });

  it('gives real debris distinct silhouettes without inventing item types', () => {
    expect(getDebrisRenderKind('Wood Plank')).toBe('wood');
    expect(getDebrisRenderKind('Plastic')).toBe('bottle');
    expect(getDebrisRenderKind('Ancient Compass')).toBe('crate');
  });

  it('maps only server-backed hazard types to cinematic presentations', () => {
    expect(getCinematicKind('shark_attack')).toBe('shark');
    expect(getCinematicKind('tsunami')).toBe('tsunami');
    expect(getCinematicKind('heavy_downpour')).toBe('storm');
    expect(getCinematicKind('discovery')).toBe(null);
  });

  it('returns stable CSS motion classes for ordinary and threatened water', () => {
    expect(getWorldMotionClass({ moving: false, visualPhase: 'day', eventType: null })).toBe('calm');
    expect(getWorldMotionClass({ moving: true, visualPhase: 'day', eventType: null })).toBe('windy');
    expect(getWorldMotionClass({ moving: true, visualPhase: 'night', eventType: 'tsunami' })).toBe('storm');
  });

  it('gives the reference composition a large lower-middle hero raft', () => {
    const layout = getHeroRaftLayout({ width: 1920, height: 1080 });
    expect(layout.widthPercent).toBeGreaterThanOrEqual(30);
    expect(layout.topPercent).toBeGreaterThanOrEqual(50);
    expect(layout.topPercent).toBeLessThanOrEqual(62);
    expect(layout.maxWidth).toBeGreaterThan(560);
  });

  it('keeps reference water bands and decorative clusters inside the stage', () => {
    expect(REFERENCE_OCEAN_BANDS.skyBottom).toBeLessThan(REFERENCE_OCEAN_BANDS.oceanTop);
    expect(REFERENCE_OCEAN_BANDS.oceanTop).toBeLessThan(REFERENCE_OCEAN_BANDS.foregroundTop);
    expect(getReferenceClusterLayout().every(({ left, top }) => left >= -8 && left <= 108 && top >= -8 && top <= 108)).toBe(true);
  });

  it('gates reference raft props from real raft/debris state', () => {
    expect(getReferenceRaftProps({ raftSize: 1, upgrades: [], debris: [] })).toEqual({
      showBucket: false,
      showPlanter: false,
      showFishingRig: false,
      showSail: false,
      showNet: false,
      showSpearRack: false,
    });
    expect(getReferenceRaftProps({
      raftSize: 3,
      upgrades: ['Sail', 'Net Launcher', 'Spear Rack'],
      debris: [{ itemName: 'Collection Hook' }],
    })).toEqual({
      showBucket: true,
      showPlanter: true,
      showFishingRig: true,
      showSail: true,
      showNet: true,
      showSpearRack: true,
    });
  });
});
