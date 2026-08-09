import '../../css/tokens.css';
import '../../css/global.css';
import { createPageApp } from '../app';
import { renderOceanPage } from '../pages/OceanPage';

createPageApp(renderOceanPage, { protectedPage: true });
