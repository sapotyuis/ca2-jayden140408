import { createPageApp } from '../app.js';
import { renderGamePage } from '../pages/GamePage.js';

createPageApp(renderGamePage, { protectedPage: true });
