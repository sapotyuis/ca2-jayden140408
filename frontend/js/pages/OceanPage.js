import styles from '../../css/OceanPage.module.css';
import { escapeHtml } from '../lib/dom';
import { mountOceanViewport } from '../components/oceanViewport';
import { pixelIcon, worldClock } from '../components/vanilla';

let logId = 0;

export const renderOceanPage = ({ root, auth, worldClock: worldClockStore }) => {
  let stats = { materials: 0, raftSize: 1 };
  let showInstructions = true;
  let loading = true;
  let entries = [];
  let eventAlert = null;
  let alertTimer;
  let disposed = false;
  root.innerHTML = `<div class="${styles.wrap}"><div data-ocean-canvas></div><div class="${styles.vignette}" aria-hidden="true"></div><div data-ocean-loading class="${styles.loading}"><span class="${styles.spinner}" aria-hidden="true"></span><p>Loading your voyage…</p></div><div data-ocean-hud class="${styles.hud}"></div></div>`;
  const wrap = root.firstElementChild;
  const canvasHost = wrap.querySelector('[data-ocean-canvas]');
  const loadingNode = wrap.querySelector('[data-ocean-loading]');
  const hud = wrap.querySelector('[data-ocean-hud]');

  const pushLog = (text, tone) => {
    const id = logId++;
    entries = [{ id, text, tone }, ...entries].slice(0, 5);
    render();
    window.setTimeout(() => { entries = entries.filter((entry) => entry.id !== id); if (!disposed) render(); }, 4600);
  };
  const render = () => {
    loadingNode.hidden = !loading;
    hud.innerHTML = `${eventAlert ? `<div class="${styles.eventAlert} ${eventAlert.prevented ? styles.eventProtected : styles.eventDanger}" role="status"><div class="${styles.eventKicker}">${eventAlert.prevented ? 'Defence successful' : 'DANGER ALERT'}</div><div class="${styles.eventTitle}">${escapeHtml(eventAlert.event?.event_name || 'Danger approaching')}</div><p class="${styles.eventDescription}">${escapeHtml(eventAlert.message || eventAlert.event?.description || 'An unexpected hazard is threatening your raft.')}</p>${eventAlert.lost_item ? `<div class="${styles.eventConsequence}">Lost item: ${escapeHtml(eventAlert.lost_item.item_name)} ×${eventAlert.lost_item.quantity}</div>` : ''}${eventAlert.prevented && eventAlert.protection_upgrade_type ? `<div class="${styles.eventConsequence}">Protection used: ${escapeHtml(eventAlert.protection_upgrade_type)}</div>` : ''}</div>` : ''}<div class="${styles.topRow}"><div class="${styles.panel}"><button data-action="back" class="${styles.back}">← BACK TO RAFT CAMP</button><span class="${styles.stats}"><span class="${styles.stat}">${pixelIcon('materials')}<b>${stats.materials}</b></span><span class="${styles.stat}">${pixelIcon('raft')}<b>${stats.raftSize}</b></span></span></div><div class="${styles.topActions}">${worldClock(worldClockStore.getState(), true)}</div></div><p class="${styles.instructions} ${showInstructions ? '' : styles.instructionsHidden}"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys to move the raft · drag to look around<br>Sail over floating debris to collect planks, tools, and supplies.</p><div class="${styles.demoPanel}" aria-label="Test hazard controls"><span class="${styles.demoLabel}">TEST AN EVENT</span><button type="button" data-demo="shark_attack" class="${styles.demoButton} ${styles.demoShark}"${loading ? ' disabled' : ''}>SHARK ATTACK</button><button type="button" data-demo="tsunami" class="${styles.demoButton} ${styles.demoTsunami}"${loading ? ' disabled' : ''}>TSUNAMI WAVE</button><button type="button" data-demo="heavy_downpour" class="${styles.demoButton} ${styles.demoDownpour}"${loading ? ' disabled' : ''}>HEAVY RAIN</button></div><div class="${styles.log}">${entries.map((entry) => `<div class="${styles.logEntry} ${styles[`log_${entry.tone}`] || ''}">${escapeHtml(entry.text)}</div>`).join('')}</div>`;
  };
  const scene = mountOceanViewport(canvasHost, {
    auth,
    worldClock: worldClockStore,
    mode: 'voyage',
    interactive: true,
    collectiblesEnabled: true,
    fetchStatus: true,
    onStatus: (next) => { stats = { ...stats, ...next }; render(); },
    onLog: pushLog,
    onInteract: () => { showInstructions = false; render(); },
    onUnexpectedEvent: (event) => { eventAlert = event; window.clearTimeout(alertTimer); alertTimer = window.setTimeout(() => { eventAlert = null; if (!disposed) render(); }, 7600); render(); },
    onReady: () => { loading = false; render(); },
  });
  const onClick = (event) => {
    const back = event.target.closest('[data-action="back"]');
    if (back) return window.location.assign('/camp.html');
    const demo = event.target.closest('[data-demo]');
    if (demo) scene.scene.triggerDemoEvent(demo.dataset.demo);
  };
  wrap.addEventListener('click', onClick);
  render();
  return () => { disposed = true; window.clearTimeout(alertTimer); wrap.removeEventListener('click', onClick); scene(); };
};
