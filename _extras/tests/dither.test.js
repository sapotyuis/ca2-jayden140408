import { describe, expect, it } from 'vitest';
import { BAYER_4X4, DITHER_LEVELS, DITHER_SIZE, SEAM_LEVELS, clampLevel, ellipseRimSpans, ellipseSpans, isDitherCellSet, planDitherRamp, ratioToLevel } from '../../public/js/ocean/dither.js';

const coverageAtLevel = (level) => {
  let set = 0;
  for (let y = 0; y < DITHER_SIZE; y += 1) {
    for (let x = 0; x < DITHER_SIZE; x += 1) {
      if (isDitherCellSet(x, y, level)) set += 1;
    }
  }
  return set;
};

describe('bayer matrix', () => {
  it('is a complete 4x4 permutation of 0-15', () => {
    const values = BAYER_4X4.flat().sort((a, b) => a - b);
    expect(values).toEqual(Array.from({ length: 16 }, (unused, index) => index));
  });

  it('sets exactly `level` of the 16 cells, so coverage is predictable', () => {
    for (let level = 0; level <= DITHER_LEVELS; level += 1) {
      expect(coverageAtLevel(level)).toBe(level);
    }
  });

  it('is monotonic — raising the level never unsets a cell', () => {
    for (let level = 0; level < DITHER_LEVELS; level += 1) {
      for (let y = 0; y < DITHER_SIZE; y += 1) {
        for (let x = 0; x < DITHER_SIZE; x += 1) {
          if (isDitherCellSet(x, y, level)) expect(isDitherCellSet(x, y, level + 1)).toBe(true);
        }
      }
    }
  });

  it('tiles cleanly, including at negative coordinates', () => {
    for (let level = 0; level <= DITHER_LEVELS; level += 2) {
      expect(isDitherCellSet(-4, -4, level)).toBe(isDitherCellSet(0, 0, level));
      expect(isDitherCellSet(-1, -3, level)).toBe(isDitherCellSet(3, 1, level));
      expect(isDitherCellSet(9, 6, level)).toBe(isDitherCellSet(1, 2, level));
    }
  });

  it('scatters set cells rather than clustering them into a solid block', () => {
    // A 50% tile should have no fully-set row or column, which is what makes it read as a texture
    // rather than as stripes.
    for (let y = 0; y < DITHER_SIZE; y += 1) {
      const row = [0, 1, 2, 3].filter((x) => isDitherCellSet(x, y, 8));
      expect(row.length).toBe(2);
    }
  });
});

describe('level clamping', () => {
  it('clamps out-of-range levels', () => {
    expect(clampLevel(-5)).toBe(0);
    expect(clampLevel(99)).toBe(DITHER_LEVELS);
    expect(clampLevel(7.4)).toBe(7);
  });

  it('snaps the endpoints so a full fill has no stray holes in it', () => {
    // The classic ordered-dither artefact: 0.99 rounding to 16 minus a few pixels reads as a
    // mistake rather than as a texture, so the endpoints are exact.
    expect(ratioToLevel(0)).toBe(0);
    expect(ratioToLevel(1)).toBe(DITHER_LEVELS);
    expect(ratioToLevel(-2)).toBe(0);
    expect(ratioToLevel(4)).toBe(DITHER_LEVELS);
  });

  it('never collapses an interior ratio to fully empty or fully solid', () => {
    for (const ratio of [0.01, 0.2, 0.5, 0.8, 0.99]) {
      const level = ratioToLevel(ratio);
      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThan(DITHER_LEVELS);
    }
  });
});

describe('banded ramps', () => {
  it('produces the requested number of bands', () => {
    expect(planDitherRamp(0, 100, 5).length).toBe(5);
    expect(planDitherRamp(0, 100, 1).length).toBe(1);
  });

  it('leaves the last band without a seam — there is nothing to hand over to', () => {
    const bands = planDitherRamp(0, 120, 4);
    expect(bands.at(-1).seam).toBeNull();
    expect(bands.slice(0, -1).every((band) => band.seam !== null)).toBe(true);
  });

  it('covers the full height without gaps between bands', () => {
    const bands = planDitherRamp(0, 160, 4, { seam: 0.5 });
    for (let index = 0; index < bands.length - 1; index += 1) {
      const band = bands[index];
      const bandEnd = band.seam.y + band.seam.height;
      expect(bandEnd).toBeGreaterThanOrEqual(bands[index + 1].solid.y - 1);
    }
  });

  it('walks the ratio from 0 to 1 so callers can index a colour ramp', () => {
    const bands = planDitherRamp(0, 100, 5);
    expect(bands[0].ratio).toBe(0);
    expect(bands.at(-1).ratio).toBe(1);
  });

  it('gives every band a height of at least one pixel even on a tiny ramp', () => {
    for (const band of planDitherRamp(0, 3, 5)) {
      expect(band.solid.height).toBeGreaterThanOrEqual(1);
      if (band.seam) expect(band.seam.height).toBeGreaterThanOrEqual(1);
    }
  });

  it('uses seam levels that are interior steps, not the endpoints', () => {
    for (const level of SEAM_LEVELS) {
      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThan(DITHER_LEVELS);
    }
    expect([...SEAM_LEVELS].sort((a, b) => a - b)).toEqual(SEAM_LEVELS);
  });
});

/**
 * Non-rectangular dither regions. These exist because filling a rect with 25% dither to fake a
 * glow, a wake or a shadow reads as a checkered box — the defect these spans were written to fix.
 */
describe('ellipse spans', () => {
  it('is widest at the centre row and narrows toward the poles', () => {
    const spans = ellipseSpans(0, 0, 20, 10);
    const widths = spans.map((span) => span.w);
    const widest = Math.max(...widths);
    expect(widths.indexOf(widest)).toBeGreaterThan(0);
    expect(widths.indexOf(widest)).toBeLessThan(widths.length - 1);
    expect(widths[0]).toBeLessThan(widest);
    expect(widths.at(-1)).toBeLessThan(widest);
  });

  it('never exceeds the bounding box', () => {
    const spans = ellipseSpans(50, 30, 20, 10);
    for (const span of spans) {
      expect(span.x).toBeGreaterThanOrEqual(30);
      expect(span.x + span.w).toBeLessThanOrEqual(70);
      expect(span.y).toBeGreaterThanOrEqual(20);
      expect(span.y).toBeLessThanOrEqual(40);
    }
  });

  it('is horizontally symmetric about its centre', () => {
    for (const span of ellipseSpans(100, 0, 15, 15)) {
      expect(Math.abs((span.x + span.w / 2) - 100)).toBeLessThanOrEqual(0.5);
    }
  });

  it('emits one span per row, with integer geometry the canvas can fill exactly', () => {
    const spans = ellipseSpans(0, 0, 9, 6);
    const rows = spans.map((span) => span.y);
    expect(new Set(rows).size).toBe(rows.length);
    for (const span of spans) {
      expect(Number.isInteger(span.x)).toBe(true);
      expect(Number.isInteger(span.y)).toBe(true);
      expect(Number.isInteger(span.w)).toBe(true);
      expect(span.w).toBeGreaterThan(0);
    }
  });

  it('degrades to something drawable at sub-pixel radii rather than emitting nothing', () => {
    expect(ellipseSpans(0, 0, 0, 0).length).toBeGreaterThan(0);
    expect(ellipseSpans(0, 0, -5, -5).length).toBeGreaterThan(0);
  });

  it('rims only the edges, leaving the interior unfilled', () => {
    const rim = ellipseRimSpans(0, 0, 30, 20, 3);
    const totalRim = rim.reduce((sum, span) => sum + span.w, 0);
    const totalFill = ellipseSpans(0, 0, 30, 20).reduce((sum, span) => sum + span.w, 0);
    expect(totalRim).toBeGreaterThan(0);
    // A rim of a large ellipse must be far cheaper than filling it, or it is not a rim.
    expect(totalRim).toBeLessThan(totalFill * 0.5);
  });

  it('collapses to a single span on rows narrower than two rim widths', () => {
    // On a wide row a left and a right rim are correct. Only where the row is too narrow to hold
    // both would they overlap into a solid cap, and there the rim must collapse to one span.
    // A narrow ellipse, so rows genuinely fall below 2x thickness. On a wide one (the raft wake)
    // every row is comfortably wider than the rim and the collapse never triggers.
    const thickness = 4;
    const rim = ellipseRimSpans(0, 0, 5, 8, thickness);
    const byRow = new Map();
    for (const span of rim) byRow.set(span.y, [...(byRow.get(span.y) || []), span]);

    for (const [y, spans] of byRow) {
      const full = ellipseSpans(0, 0, 5, 8).find((span) => span.y === y);
      if (full.w <= thickness * 2) expect(spans.length).toBe(1);
      // Whichever it is, the rim never spills outside the shape it is rimming.
      for (const span of spans) {
        expect(span.x).toBeGreaterThanOrEqual(full.x);
        expect(span.x + span.w).toBeLessThanOrEqual(full.x + full.w);
      }
    }
    // And at least one row somewhere is narrow enough to exercise the collapse.
    expect([...byRow.values()].some((spans) => spans.length === 1)).toBe(true);
  });
});

describe('seam levels', () => {
  it('are interior steps, not the endpoints', () => {
    for (const level of SEAM_LEVELS) {
      expect(level).toBeGreaterThan(0);
      expect(level).toBeLessThan(DITHER_LEVELS);
    }
    expect([...SEAM_LEVELS].sort((a, b) => a - b)).toEqual(SEAM_LEVELS);
  });
});
