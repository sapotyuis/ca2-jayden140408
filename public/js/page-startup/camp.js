// Loads the protected camp page and starts its shared frontend application.
import { createPageApp } from '../app.js';
import { renderGamePage } from '../screens/campPage.js';

createPageApp(renderGamePage, { protectedPage: true });
