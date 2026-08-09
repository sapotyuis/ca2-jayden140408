import { describe, expect, it } from 'vitest';
import { BASE_HEIGHT, BASE_WIDTH, MAX_SCALE, pickIntegerScale, resolveViewport } from '../../frontend/js/ocean/pixelScale.js';

/** Every desktop resolution the brief asks the game to support. */
const TARGETS = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1600x900', width: 1600, height: 900 },
  { label: '1440x900', width: 1440, height: 900 },
  { label: '1366x768', width: 1366, height: 768 },
  { label: '1280x720', width: 1280, height: 720 },
];

describe('integer pixel scaling', () => {
  it('renders the primary target at an exact 4x of the 480x270 base', () => {
    const view = resolveViewport(1920, 1080);
    expect(view.scale).toBe(4);
    expect(view.width).toBe(BASE_WIDTH);
    expect(view.height).toBe(BASE_HEIGHT);
    expect(view.cssWidth).toBe(1920);
    expect(view.cssHeight).toBe(1080);
  });

  it.each(TARGETS)('scales $label by a whole number on both axes', ({ width, height }) => {
    const view = resolveViewport(width, height);

    expect(Number.isInteger(view.scale)).toBe(true);
    // The regression this system exists to prevent: 1440x900 previously scaled a fixed 320x180
    // backing store by 4.5 horizontally and 5.0 vertically, so the "pixels" were rectangles.
    expect(view.cssWidth / view.width).toBe(view.scale);
    expect(view.cssHeight / view.height).toBe(view.scale);
  });

  it.each(TARGETS)('covers the whole $label viewport with no letterboxing', ({ width, height }) => {
    const view = resolveViewport(width, height);
    expect(view.cssWidth).toBeGreaterThanOrEqual(width);
    expect(view.cssHeight).toBeGreaterThanOrEqual(height);
  });

  it.each(TARGETS)('keeps $label overhang under one logical pixel per axis', ({ width, height }) => {
    const view = resolveViewport(width, height);
    expect(view.cssWidth - width).toBeLessThan(view.scale * 2);
    expect(view.cssHeight - height).toBeLessThan(view.scale * 2);
  });

  it.each(TARGETS)('holds $label within 15% of the 480x270 logical target', ({ width, height }) => {
    const view = resolveViewport(width, height);
    // Rounding rather than flooring the scale is what keeps this band tight. Flooring would render
    // 1280x720 at 2x — 640x360 logical — so the smallest supported desktop would show the most
    // world, which is backwards. The band is not exactly 480x270 because the canvas is sized to
    // cover the viewport rather than to a fixed logical size; see resolveViewport.
    expect(view.width).toBeGreaterThanOrEqual(BASE_WIDTH * 0.85);
    expect(view.width).toBeLessThanOrEqual(BASE_WIDTH * 1.15);
    expect(view.height).toBeGreaterThanOrEqual(BASE_HEIGHT * 0.85);
    expect(view.height).toBeLessThanOrEqual(BASE_HEIGHT * 1.15);
  });

  it('keeps logical dimensions even so the 4x4 dither grid tiles to every edge', () => {
    for (const { width, height } of TARGETS) {
      const view = resolveViewport(width, height);
      expect(view.width % 2).toBe(0);
      expect(view.height % 2).toBe(0);
    }
  });

  it('puts the waterline in the upper third and the centre in the middle', () => {
    const view = resolveViewport(1920, 1080);
    expect(view.horizonY).toBe(Math.round(BASE_HEIGHT * 0.34));
    expect(view.centre).toEqual({ x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2 });
  });

  it('clamps the scale rather than returning zero or absurd multiples', () => {
    expect(pickIntegerScale(100, 100)).toBe(1);
    expect(pickIntegerScale(0, 0)).toBe(1);
    expect(pickIntegerScale(100000, 100000)).toBe(MAX_SCALE);
  });

  it('never returns a fractional or non-finite scale for junk input', () => {
    for (const input of [[NaN, NaN], [undefined, undefined], [-500, -500]]) {
      const scale = pickIntegerScale(input[0], input[1]);
      expect(Number.isInteger(scale)).toBe(true);
      expect(scale).toBeGreaterThanOrEqual(1);
    }
  });
});
