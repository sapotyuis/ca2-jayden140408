import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sourceFiles = [
  'src/db/schema.js',
  'src/db/seed.js',
  'src/routes/meRoutes.js',
  'src/routes/itemTypeRoutes.js',
  'src/routes/questRoutes.js',
  'src/routes/oceanEventRoutes.js',
  'src/routes/userEventRoutes.js',
  'src/controllers/meController.js',
  'src/controllers/itemTypeController.js',
  'src/models/userModel.js',
  'src/models/userItemModel.js',
  'src/models/debrisModel.js',
  'src/models/unexpectedEventModel.js',
  'src/utils/unexpectedEventRules.js',
  'frontend/js/pages/GamePage.js',
  'frontend/js/pages/OceanPage.js',
  'frontend/js/pages/LeaderboardPage.js',
  'frontend/js/components/game/vanillaPanels.js',
  'frontend/js/components/vanilla.js',
  'frontend/js/lib/gameState.js',
  'frontend/js/ocean/createOceanScene.js',
];

const source = Object.fromEntries(
  sourceFiles.map((file) => [file, readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')])
);

describe('removed hunger and food mechanics', () => {
  it('does not expose hunger in the database, API, or frontend', () => {
    const offenders = Object.entries(source)
      .filter(([, contents]) => /hunger/i.test(contents))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });

  it('does not expose food items or food quests', () => {
    const forbiddenFood = /craft_food|hunger_restore|category\s*[:=].*['"]food['"]|['"]food['"]\s*\]/i;
    const offenders = Object.entries(source)
      .filter(([, contents]) => forbiddenFood.test(contents))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });
});
