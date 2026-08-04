import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CSS_PALETTE_TOKENS, PHASE_PALETTES, RAMPS, applyAtmosphere, mixHex, resolvePhase } from '../../frontend/src/ocean/palette.js';

const tokensCss = readFileSync(fileURLToPath(new URL('../../frontend/src/styles/tokens.css', import.meta.url)), 'utf8');

/** Pulls `--name: #value;` declarations out of the stylesheet. Only literal hexes — the semantic
 *  layer is all `var(...)` references and is deliberately not part of the mirror. */
const declaredHexTokens = () => {
  const declarations = new Map();
  for (const match of tokensCss.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)) {
    declarations.set(match[1], match[2].toLowerCase());
  }
  return declarations;
};

describe('palette token mirror', () => {
  it('declares every palette ramp token in tokens.css with an identical value', () => {
    const declared = declaredHexTokens();
    const drifted = Object.entries(CSS_PALETTE_TOKENS)
      .filter(([name, value]) => declared.get(name) !== value.toLowerCase())
      .map(([name, value]) => `${name}: expected ${value}, stylesheet has ${declared.get(name) ?? 'nothing'}`);

    expect(drifted).toEqual([]);
  });

  it('covers every colour group the art direction requires', () => {
    const required = ['sky', 'ocean', 'foam', 'sand', 'wood', 'vegetation', 'rock', 'uiDark', 'uiMid', 'uiLight', 'danger', 'warning', 'success', 'night', 'storm'];
    expect(required.filter((group) => !RAMPS[group])).toEqual([]);
  });

  it('names a single-shade ramp entry after its group and suffixes the rest', () => {
    expect(CSS_PALETTE_TOKENS['--foam']).toBe(RAMPS.foam.base);
    expect(CSS_PALETTE_TOKENS['--foam-light']).toBe(RAMPS.foam.light);
    // camelCase group and shade keys both become kebab-case.
    expect(CSS_PALETTE_TOKENS['--ui-dark-deep']).toBe(RAMPS.uiDark.deep);
    expect(CSS_PALETTE_TOKENS['--storm-cloud-dark']).toBe(RAMPS.storm.cloudDark);
  });
});

describe('phase selection', () => {
  it('lets weather outrank the clock, so a downpour at noon is still a storm', () => {
    expect(resolvePhase({ daylight: 1, visualPhase: 'day' }, 'heavy_downpour')).toBe('storm');
    expect(resolvePhase({ daylight: 1, visualPhase: 'day' }, 'tsunami')).toBe('storm');
  });

  it('leaves a shark attack on the ambient palette — it is a hazard, not weather', () => {
    expect(resolvePhase({ daylight: 1, visualPhase: 'day' }, 'shark_attack')).toBe('day');
  });

  it('maps the world clock onto day, dusk and night', () => {
    expect(resolvePhase({ daylight: 1, visualPhase: 'day' })).toBe('day');
    expect(resolvePhase({ daylight: 0, visualPhase: 'night' })).toBe('night');
    expect(resolvePhase({ daylight: 0.5, visualPhase: 'day' })).toBe('dusk');
    // The clock's own twilight labels win regardless of the daylight number.
    expect(resolvePhase({ daylight: 1, visualPhase: 'dawn' })).toBe('dusk');
    expect(resolvePhase({ daylight: 0, visualPhase: 'dusk' })).toBe('dusk');
  });

  it('gives every phase a complete palette with the same keys', () => {
    const dayKeys = Object.keys(PHASE_PALETTES.day).sort();
    for (const phase of ['dusk', 'night', 'storm']) {
      expect(Object.keys(PHASE_PALETTES[phase]).sort()).toEqual(dayKeys);
    }
  });

  it('keeps the silhouette colour identical across phases so edges never wash out', () => {
    for (const phase of ['dusk', 'night', 'storm']) {
      expect(PHASE_PALETTES[phase].outline).toBe(PHASE_PALETTES.day.outline);
    }
  });

  it('keeps storm foam brighter than night foam — heavy weather is the violent state', () => {
    const brightness = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(brightness(PHASE_PALETTES.storm.foamLight)).toBeGreaterThan(brightness(PHASE_PALETTES.night.foamLight));
  });
});

describe('colour maths', () => {
  it('blends between two hexes at the requested ratio', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('clamps a blend ratio rather than producing an out-of-range channel', () => {
    expect(mixHex('#000000', '#ffffff', -3)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 9)).toBe('#ffffff');
  });

  it('pulls distant geometry toward the horizon haze and leaves near geometry alone', () => {
    const palette = PHASE_PALETTES.day;
    expect(applyAtmosphere(palette.leafDarkest, palette, 0)).toBe(palette.leafDarkest);
    const far = applyAtmosphere(palette.leafDarkest, palette, 1);
    expect(far).not.toBe(palette.leafDarkest);
    // Never fully hazed out, or distant islands would vanish into the sky.
    expect(far).not.toBe(palette.haze);
  });
});
