import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OCEAN_RENDER_TUNING } from '../../public/js/voyage/voyageWorld.js';

const oceanSource = readFileSync(new URL('../../public/js/voyage/voyageWorld.js', import.meta.url), 'utf8');

describe('ocean rendering tuning', () => {
  it('keeps ordinary water highlights below the bloom threshold', () => {
    expect(OCEAN_RENDER_TUNING.bloomThreshold).toBeGreaterThan(0.5);
    expect(OCEAN_RENDER_TUNING.bloomStrengthNight).toBeLessThan(0.7);
  });

  it('does not block the first voyage frame on the optional event catalogue', () => {
    const readyIndex = oceanSource.indexOf('    signalReady();');
    const eventLoadIndex = oceanSource.indexOf('loadUnexpectedEvents().catch');

    expect(readyIndex).toBeGreaterThan(-1);
    expect(eventLoadIndex).toBeGreaterThan(readyIndex);
  });

  it('lets the browser paint the ready state before the expensive first WebGL render', () => {
    const readyIndex = oceanSource.indexOf('    signalReady();');
    const renderIndex = oceanSource.indexOf('window.setTimeout(() => {', readyIndex);

    expect(readyIndex).toBeGreaterThan(-1);
    expect(renderIndex).toBeGreaterThan(readyIndex);
  });

  it('reports boot failures instead of leaving the voyage loader stuck forever', () => {
    expect(oceanSource).toContain("boot().catch((error) => {");
    expect(oceanSource).toContain("onLog?.('Could not finish loading the voyage.', 'error');");
  });
});
