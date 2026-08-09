import styles from '../../css/AuthShell.module.css';
import form from '../../css/authForm.module.css';
import { escapeHtml } from '../lib/dom';
import { mountOceanViewport } from '../components/oceanViewport';
import { worldClock } from '../components/vanilla';

export const renderAuthShell = ({ root, auth, worldClockStore, tone = 'night', status, title, lede, content, footer }) => {
  root.innerHTML = `<div class="${styles.authRoot || ''}"><main class="${styles.spread}">
    <aside class="${styles.scene}" aria-hidden="true"><div class="${styles.sceneInner}">
      <div class="${styles.signalBar}"><span>CASTAWAY CHRONICLES</span><span>WORLD 01 / OPEN OCEAN</span></div>
      <p class="${styles.eyebrow}">RAFT SURVIVAL GAME / PLAYER ACCOUNT</p>
      <h1 class="${styles.brand}">Castaway<br>Chronicles</h1>
      <p class="${styles.atmos}">“Every survivor starts with a single plank.”</p>
      <div class="${styles.sceneRule}"></div>
      <div class="${styles.sceneStats}"><div><span>CURRENT LOCATION</span><strong>OPEN OCEAN</strong></div><div><span>OBJECTIVE</span><strong>STAY AFLOAT</strong></div><div><span>THREAT LEVEL</span><strong>UNKNOWN</strong></div></div>
    </div></aside>
    <section class="${styles.log}" aria-labelledby="auth-title"><div class="${styles.clockDock}">${worldClock(worldClockStore.getState(), true)}</div>
      <div class="${styles.board}"><div class="${styles.paper}"><span class="${styles.clip}" aria-hidden="true"></span>
        ${status ? `<p class="${styles.status}">${escapeHtml(status)}</p>` : ''}<h2 id="auth-title" class="${styles.logTitle}">${escapeHtml(title)}</h2>
        ${lede ? `<p class="${styles.lede}">${escapeHtml(lede)}</p>` : ''}<div class="${styles.rule}" aria-hidden="true"></div>${content}
        ${footer ? `<p class="${styles.switch}">${footer}</p>` : ''}
      </div></div>
    </section>
  </main></div>`;

  const background = document.createElement('div');
  background.className = `${styles.registerWorld || ''}`;
  background.style.position = 'fixed';
  background.style.inset = '0';
  background.style.zIndex = '-1';
  root.prepend(background);
  const disposeScene = mountOceanViewport(background, { auth, worldClock: worldClockStore, mode: 'title', interactive: false, collectiblesEnabled: false, fetchStatus: false });
  return { form, shell: root.querySelector('main'), dispose: () => disposeScene() };
};
