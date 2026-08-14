// Renders the raft camp where the player manages quests, inventory, crafting, upgrades, and profile settings.
import { createClassNames } from '../helpers/cssClassNames.js';
import { escapeHtml } from '../helpers/domHelpers.js';
import { button, statChip, worldClock } from '../helpers/uiComponents.js';
import { createGameState } from '../game/campData.js';
import { craftingPanel, inventoryPanel, profilePanel, questsPanel, statusPanel, upgradesPanel } from '../camp/campPanels.js';

const styles = createClassNames('game-page');

const STATIONS = [
  { id: 'quests', icon: '◈', label: 'QUESTS', title: 'Quest hub', caption: 'Track objectives, rewards, and your next voyage' },
  { id: 'inventory', icon: '▣', label: 'INVENTORY', title: 'Inventory', caption: 'View everything collected from the ocean' },
  { id: 'crafting', icon: '✦', label: 'CRAFTING', title: 'Crafting bench', caption: 'Turn collected materials into useful items' },
  { id: 'upgrades', icon: '⬡', label: 'UPGRADES', title: 'Raft upgrades', caption: 'Expand and protect your raft' },
  { id: 'profile', icon: '◎', label: 'PROFILE', title: 'Survivor profile', caption: 'Manage your survivor account' },
];

export const renderGamePage = ({ root, auth, toast }) => {
  const game = createGameState({ auth, toast });
  let activeStation = 'quests';
  const shell = document.createElement('div');
  shell.className = styles.gameShell;
  root.replaceChildren(shell);

  const render = (view = game.getView()) => {
    const active = STATIONS.find((station) => station.id === activeStation) || STATIONS[0];
    const workspace = activeStation === 'quests'
      ? `<section class="${styles.hubHero}"><div><span class="${styles.hubKicker}">MISSION CONTROL / SURVIVAL OBJECTIVES</span><h1>QUEST HUB</h1><p>Track your objectives, claim rewards, and prepare your raft before setting sail.</p></div><div class="${styles.hubLocation}"><span>CURRENT LOCATION</span><strong>RAFT CAMP</strong><b>READY TO SAIL</b></div></section><div class="${styles.questLayout}"><section class="${styles.questPrimary}" aria-labelledby="quest-board-title"><div class="${styles.sectionHeading}"><span>ACTIVE OBJECTIVES</span><h2 id="quest-board-title">Quest board</h2><p>Complete objectives while you play and claim rewards here.</p></div>${questsPanel(view.quests, view.itemsById, view.status?.raft_size ?? 1, 0)}</section><aside class="${styles.hubSidebar}" aria-label="Survival summary">${statusPanel(view.status, 1)}<section class="${styles.sailCard}"><span class="${styles.sailKicker}">NEXT ACTION</span><h2>Ready for the ocean?</h2><p>Press START VOYAGE when you want to control the raft, collect debris, and face ocean events.</p><div class="${styles.sailFacts}"><span><b>Raft tiles</b>${view.status?.raft_size ?? 1}</span><span><b>Installed upgrades</b>${view.status?.upgrades?.length || 0}</span></div></section></aside></div>`
      : `<section class="${styles.workspacePage}" aria-labelledby="workspace-title"><header class="${styles.workspaceHeader}"><div><span class="${styles.workspaceKicker}">${active.label} WORKSPACE</span><h1 id="workspace-title">${active.title}</h1><p>${active.caption}</p></div><span class="${styles.workspaceStatus}">CAMP CONSOLE</span></header><div class="${styles.workspaceBody}">${activeStation === 'inventory' ? inventoryPanel(view.inventoryItems) : activeStation === 'crafting' ? craftingPanel(view.craftables) : activeStation === 'upgrades' ? upgradesPanel(view.status) : profilePanel()}</div></section>`;
    shell.innerHTML = `<header class="${styles.hud}"><div class="${styles.brandBlock}"><span class="${styles.brandKicker}">CASTAWAY CHRONICLES / QUEST HUB</span><div class="${styles.brandLine}"><strong class="${styles.brandMark}">RAFT CAMP</strong><span class="${styles.brandDivider}">/</span><span class="${styles.brandUser}">${escapeHtml(auth.getState().user?.username || 'UNKNOWN')}</span></div></div><div class="${styles.gauges}" aria-label="Your survival resources">${statChip('materials', view.status?.materials ?? 0, 'Materials')}${statChip('raft', view.status?.raft_size ?? 1, 'Raft size')}</div><div class="${styles.actions}">${worldClock(window.__ccWorldTime || { visualPhase: 'night', label: 'Night watch', secondsRemaining: 180, progress: 0 }, true)}${button({ label: 'START VOYAGE', action: 'voyage' })}${button({ label: 'LEADERBOARD', variant: 'ghost', action: 'leaderboard' })}${button({ label: 'SIGN OUT', variant: 'ghost', action: 'logout' })}</div></header>${view.loading ? `<div class="${styles.loading}"><span class="${styles.loadingMark}">◎</span><span>Loading your quest hub…</span></div>` : `<main class="${styles.questHub}">${workspace}<nav class="${styles.stationDock}" aria-label="Raft management options"><span class="${styles.dockLabel}">MANAGE YOUR RAFT</span><div class="${styles.stationButtons}">${STATIONS.map((station) => `<button type="button" data-station="${station.id}" class="${styles.stationButton} ${activeStation === station.id ? styles.stationButtonActive : ''}" aria-pressed="${activeStation === station.id}"><span class="${styles.stationIcon}" aria-hidden="true">${station.icon}</span><span>${station.label}</span></button>`).join('')}</div></nav></main>`}`;
  };

  const onClick = async (event) => {
    const station = event.target.closest('[data-station]');
    if (station) { activeStation = station.dataset.station; render(); return; }
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;
    const [action, value] = actionNode.dataset.action.split(':');
    if (action === 'voyage') return window.location.assign('/voyage');
    if (action === 'leaderboard') return window.location.assign('/leaderboard');
    if (action === 'logout') { auth.logout(); return window.location.replace('/login'); }
    if (action === 'craft') { actionNode.disabled = true; return game.craft(Number(value)); }
    if (action === 'upgrade') { actionNode.disabled = true; return game.upgrade(value); }
    if (action === 'claim-quest') { actionNode.disabled = true; return game.claimQuest(Number(value)); }
    if (action === 'delete-survivor') {
      if (!window.confirm('This will permanently delete your survivor, raft, inventory, and progress. Continue?')) return;
      actionNode.disabled = true;
      const result = await auth.api('/api/me', { method: 'DELETE' });
      if (!result.ok) { toast.push(result.data?.error?.message || result.data?.message || 'Could not delete your survivor.', 'error'); actionNode.disabled = false; return; }
      auth.logout();
      window.location.replace('/login');
    }
  };
  const onSubmit = async (event) => {
    const profile = event.target.closest('[data-profile-form]');
    if (!profile) return;
    event.preventDefault();
    const username = profile.elements.username.value.trim();
    if (!username) return;
    const result = await auth.api('/api/me', { method: 'PATCH', body: { username } });
    if (!result.ok) return toast.push(result.data?.error?.message || result.data?.message || 'Could not update your survivor name.', 'error');
    auth.setUser(result.data);
    profile.reset();
    toast.push('Survivor name updated.', 'success');
  };
  const unsubscribeGame = game.subscribe(render);
  shell.addEventListener('click', onClick);
  shell.addEventListener('submit', onSubmit);
  render();
  game.loadAll().catch((error) => { console.error('[GAME] dashboard load failed', { message: error.message || String(error) }); toast.push('Could not reach the server. Please refresh.', 'error'); });
  return () => { unsubscribeGame(); shell.removeEventListener('click', onClick); shell.removeEventListener('submit', onSubmit); };
};
