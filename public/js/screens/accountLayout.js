// Builds the shared login and registration layout with the world clock and decorative ocean background.
import { createClassNames } from '../helpers/cssClassNames.js';
import { escapeHtml } from '../helpers/domHelpers.js';
import { mountOceanViewport } from '../voyage/oceanCanvas.js';
import { worldClock } from '../helpers/uiComponents.js';

const styles = createClassNames('auth-shell');

export const renderAuthShell = ({ root, auth, worldClockStore, status, title, lede, content, footer }) => {
  root.innerHTML = `<div><main class="${styles.spread}">
    <aside class="${styles.scene}" aria-hidden="true"><div class="${styles.sceneInner}">
      <div class="${styles.signalBar}"><span>CASTAWAY CHRONICLES</span><span>WORLD 01 / OPEN OCEAN</span></div>
      <p class="${styles.eyebrow}">RAFT SURVIVAL GAME / PLAYER ACCOUNT</p>
      <h1 class="${styles.brand}">Castaway<br>Chronicles</h1>
      <p class="${styles.atmos}">“Every survivor starts with a single plank.”</p>
      <div class="${styles.sceneRule}"></div>
      <div class="${styles.sceneStats}"><div><span>CURRENT LOCATION</span><strong>OPEN OCEAN</strong></div><div><span>OBJECTIVE</span><strong>STAY AFLOAT</strong></div><div><span>THREAT LEVEL</span><strong>UNKNOWN</strong></div></div>
    </div></aside>
    <section class="${styles.log}" aria-labelledby="auth-title"><div class="${styles.clockDock}">${worldClock(worldClockStore.getState())}</div>
      <div class="${styles.board}"><div class="${styles.paper}"><span class="${styles.clip}" aria-hidden="true"></span>
        ${status ? `<p class="${styles.status}">${escapeHtml(status)}</p>` : ''}<h2 id="auth-title" class="${styles.logTitle}">${escapeHtml(title)}</h2>
        ${lede ? `<p class="${styles.lede}">${escapeHtml(lede)}</p>` : ''}<div class="${styles.rule}" aria-hidden="true"></div>${content}
        ${footer ? `<p class="${styles.switch}">${footer}</p>` : ''}
      </div></div>
    </section>
  </main></div>`;

  const background = document.createElement('div');
  background.className = styles.registerWorld;
  background.style.position = 'fixed';
  background.style.inset = '0';
  background.style.zIndex = '-1';
  root.prepend(background);
  mountOceanViewport(background, { auth, worldClock: worldClockStore, mode: 'title', interactive: false, collectiblesEnabled: false, fetchStatus: false });
  return { shell: root.querySelector('main') };
};
