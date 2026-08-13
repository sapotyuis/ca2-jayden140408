import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gamePage = readFileSync(new URL('../../public/js/pages/GamePage.js', import.meta.url), 'utf8');
const questsPanel = readFileSync(new URL('../../public/js/components/game/vanillaPanels.js', import.meta.url), 'utf8');
const leaderboardPage = readFileSync(new URL('../../public/js/pages/LeaderboardPage.js', import.meta.url), 'utf8');

describe('quest hub navigation', () => {
  it('keeps the camp page focused on quests instead of mounting the ocean scene', () => {
    expect(gamePage).not.toContain('mountOceanViewport');
    expect(gamePage).toContain('QUEST HUB');
    expect(gamePage).toContain('questsPanel(');
  });

  it('keeps voyage navigation as the explicit start-voyage action', () => {
    expect(gamePage).toContain("window.location.assign('/html/voyage.html')");
    expect(gamePage).toContain('START VOYAGE');
  });

  it('lets signed-in survivors open the leaderboard from camp', () => {
    expect(gamePage).toContain("window.location.assign('/html/leaderboard.html')");
    expect(gamePage).toContain('LEADERBOARD');
  });

  it('lets signed-in survivors return to camp from the leaderboard', () => {
    expect(leaderboardPage).toContain("auth.getState().isAuthed ? '/html/camp.html' : '/html/login.html'");
    expect(leaderboardPage).toContain('BACK TO CAMP');
  });

  it('keeps management sections available from the quest hub', () => {
    for (const station of ['QUESTS', 'INVENTORY', 'CRAFTING', 'UPGRADES', 'PROFILE']) {
      expect(gamePage).toContain(`label: '${station}'`);
    }
  });

  it('uses the bottom rail as an in-place workspace tab switcher', () => {
    expect(gamePage).toContain("let activeStation = 'quests'");
    expect(gamePage).not.toContain('stationDrawer');
    expect(gamePage).toContain('activeStation === station.id');
  });

  it('uses one semantic heading for the quest board section', () => {
    expect(gamePage).toContain('id="quest-board-title">Quest board</h2>');
  });

  it('does not render a duplicate quest board panel header', () => {
    expect(questsPanel).toContain('panel({ content, wide: true, index });');
    expect(questsPanel).not.toContain("title: 'Quest board'");
  });

  it('shows raft-gated quests as locked instead of not started', () => {
    expect(gamePage).toContain('view.status?.raft_size ?? 1');
    expect(questsPanel).toContain('min_raft_size');
    expect(questsPanel).toContain('Locked');
  });
});
