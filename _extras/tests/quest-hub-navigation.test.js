import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gamePage = readFileSync(new URL('../../frontend/src/pages/GamePage.jsx', import.meta.url), 'utf8');

describe('quest hub navigation', () => {
  it('keeps the camp page focused on quests instead of mounting the ocean scene', () => {
    expect(gamePage).not.toMatch(/<OceanViewport\b/);
    expect(gamePage).toContain('QUEST HUB');
    expect(gamePage).toMatch(/<QuestsPanel\b/);
  });

  it('keeps voyage navigation as the explicit start-voyage action', () => {
    expect(gamePage).toMatch(/onClick=\{\(\) => navigate\('\/voyage'\)\}/);
    expect(gamePage).toContain('START VOYAGE');
  });

  it('keeps management sections available from the quest hub', () => {
    for (const station of ['QUESTS', 'INVENTORY', 'CRAFTING', 'UPGRADES', 'PROFILE']) {
      expect(gamePage).toContain(`label: '${station}'`);
    }
  });

  it('uses the bottom rail as an in-place workspace tab switcher', () => {
    expect(gamePage).toContain("useState('quests')");
    expect(gamePage).not.toContain('stationDrawer');
    expect(gamePage).toContain('activeStation === station.id');
  });
});
