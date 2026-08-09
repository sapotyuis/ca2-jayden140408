import styles from '../../css/LeaderboardPage.module.css';
import { LEADERBOARD_LIMIT, rankSurvivors } from '../lib/leaderboard';
import { escapeHtml, formatNumber } from '../lib/dom';
import { mountOceanViewport } from '../components/oceanViewport';
import { worldClock } from '../components/vanilla';

export const renderLeaderboardPage = ({ root, auth, worldClock: worldClockStore }) => {
  let disposed = false;
  root.innerHTML = `<div class="${styles.shell}"><div data-leaderboard-world class="${styles.world}"></div><main class="${styles.page}">
    <header class="${styles.header}"><div><span class="${styles.kicker}">CASTAWAY CHRONICLES / PUBLIC ROSTER</span><p class="${styles.brand}">SURVIVOR LEDGER</p></div><div class="${styles.actions}">${worldClock(worldClockStore.getState(), true)}<a href="${auth.getState().isAuthed ? '/camp.html' : '/login.html'}" class="${styles.backLink}">${auth.getState().isAuthed ? 'BACK TO CAMP' : 'BACK TO LOGIN'}</a></div></header>
    <section class="${styles.hero}" aria-labelledby="leaderboard-title"><div><span class="${styles.sectionKicker}">WHO IS STILL AFLOAT?</span><h1 id="leaderboard-title">The open-ocean leaderboard</h1><p>See how fellow survivors are building their rafts before you set out.</p></div><div class="${styles.ruleCard}"><span>RANKING ORDER</span><strong>RAFT SIZE</strong><small>Materials break ties</small></div></section>
    <div data-leaderboard-content><section class="${styles.stateCard}" aria-live="polite"><span class="${styles.spinner}" aria-hidden="true"></span><p>Reading the latest survivor logs…</p></section></div>
    <footer class="${styles.footer}"><span>TOP FIVE PUBLIC ROSTER</span><a href="/register.html">CREATE YOUR SURVIVOR ACCOUNT</a></footer>
  </main></div>`;
  const world = root.querySelector('[data-leaderboard-world]');
  const content = root.querySelector('[data-leaderboard-content]');
  const disposeScene = mountOceanViewport(world, { auth, worldClock: worldClockStore, mode: 'title', interactive: false, collectiblesEnabled: false, fetchStatus: false });

  const renderState = (state) => {
    if (state.status === 'loading') {
      content.innerHTML = `<section class="${styles.stateCard}" aria-live="polite"><span class="${styles.spinner}" aria-hidden="true"></span><p>Reading the latest survivor logs…</p></section>`;
      return;
    }
    if (state.status === 'error') {
      content.innerHTML = `<section class="${styles.stateCard}" role="alert"><span class="${styles.stateIcon}" aria-hidden="true">!</span><h2>Roster offline</h2><p>${escapeHtml(state.error)}</p><button type="button" data-retry class="${styles.retry}">TRY AGAIN</button></section>`;
      return;
    }
    if (!state.survivors.length) {
      content.innerHTML = `<section class="${styles.stateCard}"><span class="${styles.stateIcon}" aria-hidden="true">◎</span><h2>No survivors logged yet</h2><p>Be the first castaway to claim a place on the ledger.</p></section>`;
      return;
    }
    const podium = state.survivors.slice(0, 3);
    content.innerHTML = `<section class="${styles.podiumSection}" aria-labelledby="podium-title"><div class="${styles.sectionHeading}"><div><span class="${styles.sectionKicker}">THE FRONT THREE</span><h2 id="podium-title">Current standouts</h2></div><span class="${styles.rosterCount}">${state.survivors.length} SURVIVORS</span></div><div class="${styles.podium}">${podium.map((survivor, index) => { const place = index + 1; return `<article class="${styles.podiumCard} ${styles[`place${place}`] || ''}"><div class="${styles.medal}" aria-label="Rank ${place}">${place}</div><div class="${styles.podiumCopy}"><span class="${styles.podiumRank}">RANK ${String(place).padStart(2, '0')}</span><h3>${escapeHtml(survivor.username || 'Unknown survivor')}</h3><p>Raft size <strong>${formatNumber(survivor.raft_size)}</strong></p></div><span class="${styles.podiumMaterials}">${formatNumber(survivor.materials)} <small>MATERIALS</small></span></article>`; }).join('')}</div></section><section class="${styles.tableSection}" aria-labelledby="roster-title"><div class="${styles.sectionHeading}"><div><span class="${styles.sectionKicker}">TOP FIVE SURVIVORS</span><h2 id="roster-title">The top-five ledger</h2></div><span class="${styles.sortNote}">TOP 5 / RAFT SIZE</span></div><div class="${styles.tableWrap}"><table class="${styles.table}"><caption class="${styles.srOnly}">The top five survivors ranked by raft size and materials</caption><thead><tr><th scope="col">RANK</th><th scope="col">SURVIVOR</th><th scope="col">RAFT SIZE</th><th scope="col">MATERIALS</th></tr></thead><tbody>${state.survivors.map((survivor, index) => `<tr><td><span class="${styles.rankNumber}">${String(index + 1).padStart(2, '0')}</span></td><th scope="row">${escapeHtml(survivor.username || 'Unknown survivor')}</th><td><strong>${formatNumber(survivor.raft_size)}</strong><span class="${styles.unit}"> TILES</span></td><td>${formatNumber(survivor.materials)}</td></tr>`).join('')}</tbody></table></div></section>`;
  };

  const load = async () => {
    renderState({ status: 'loading' });
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    console.log('[FRONTEND] leaderboard request started', { path: '/api/users/leaderboard' });
    try {
      const response = await fetch('/api/users/leaderboard');
      console.log('[FRONTEND] leaderboard response received', { path: '/api/users/leaderboard', status: response.status, duration_ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt), request_id: response.headers.get('x-request-id') || null });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'The survivor roster is unavailable.');
      if (!Array.isArray(data)) throw new Error('The survivor roster returned an unexpected response.');
      renderState({ status: 'ready', survivors: rankSurvivors(data, LEADERBOARD_LIMIT) });
    } catch (error) {
      if (disposed) return;
      console.error('[FRONTEND] leaderboard request failed', { path: '/api/users/leaderboard', message: error.message || String(error) });
      renderState({ status: 'error', error: error.message || 'Could not load the survivor roster.' });
    }
  };
  const onClick = (event) => { if (event.target.closest('[data-retry]')) load(); };
  root.addEventListener('click', onClick);
  load();
  return () => { disposed = true; root.removeEventListener('click', onClick); disposeScene(); };
};
