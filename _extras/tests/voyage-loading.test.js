import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const oceanStyles = readFileSync(new URL('../../public/css/OceanPage.module.css', import.meta.url), 'utf8');

describe('voyage loading veil', () => {
  it('hides the veil after the page marks loading complete', () => {
    expect(oceanStyles).toMatch(/\.ocean-page-loading\[hidden\]\s*\{[\s\S]*display:\s*none\s*!important;[\s\S]*\}/);
  });
});
