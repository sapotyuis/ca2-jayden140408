import { createPageApp } from '../app.js';
import { renderOceanPage } from '../pages/OceanPage.js';

createPageApp(renderOceanPage, { protectedPage: true });
