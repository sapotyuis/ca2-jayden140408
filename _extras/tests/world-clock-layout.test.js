import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const clockCss = readFileSync(new URL('../../frontend/src/components/WorldClockBadge.module.css', import.meta.url), 'utf8');
const gamePageCss = readFileSync(new URL('../../frontend/src/pages/GamePage.module.css', import.meta.url), 'utf8');

describe('world clock layout', () => {
  it('keeps compact clock text inside its bordered badge', () => {
    expect(clockCss).toMatch(/\.clock\s*\{[\s\S]*overflow:\s*hidden;/);
    expect(clockCss).toMatch(/\.compact\s*\{[\s\S]*min-width:\s*12\.5rem;/);
    expect(clockCss).toMatch(/\.copy strong\s*\{[\s\S]*white-space:\s*nowrap;/);
    expect(gamePageCss).toMatch(/grid-template-columns:\s*minmax\(240px,\s*1fr\)\s+auto\s+minmax\(500px,\s*auto\);/);
  });
});
