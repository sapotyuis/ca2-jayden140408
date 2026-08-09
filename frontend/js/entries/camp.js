import '../../css/tokens.css';
import '../../css/global.css';
import { createPageApp } from '../app';
import { renderGamePage } from '../pages/GamePage';

createPageApp(renderGamePage, { protectedPage: true });
