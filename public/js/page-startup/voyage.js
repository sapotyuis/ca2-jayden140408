// Loads the protected voyage page and starts its shared frontend application.
import { createPageApp } from '../app.js';
import { renderOceanPage } from '../screens/voyagePage.js';

createPageApp(renderOceanPage, { protectedPage: true });
