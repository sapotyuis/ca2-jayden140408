// Loads the public leaderboard page and starts its shared frontend application.
import { createPageApp } from '../app.js';
import { renderLeaderboardPage } from '../screens/LeaderboardPage.js';

createPageApp(renderLeaderboardPage);
