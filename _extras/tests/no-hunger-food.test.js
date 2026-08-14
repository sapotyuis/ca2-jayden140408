import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sourceFiles = [
  'src/db/schema.js',
  'src/db/seed.js',
  'src/routes/playerRoutes.js',
  'src/routes/itemCatalogRoutes.js',
  'src/routes/questBoardRoutes.js',
  'src/routes/oceanEventRoutes.js',
  'src/routes/playerEventHistoryRoutes.js',
  'src/controllers/playerController.js',
  'src/controllers/itemCatalogController.js',
  'src/models/survivorDirectoryModel.js',
  'src/models/playerInventoryModel.js',
  'src/models/debrisModel.js',
  'src/models/unexpectedEventModel.js',
  'src/utils/unexpectedEventRules.js',
  'public/js/screens/campPage.js',
  'public/js/screens/voyagePage.js',
  'public/js/screens/LeaderboardPage.js',
  'public/js/camp/campPanels.js',
  'public/js/helpers/uiComponents.js',
  'public/js/game/campData.js',
  'public/js/voyage/voyageWorld.js',
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
