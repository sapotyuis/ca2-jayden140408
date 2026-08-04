import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OceanViewport from '../components/OceanViewport';
import WorldClockBadge from '../components/WorldClockBadge';
import { LEADERBOARD_LIMIT, rankSurvivors } from '../lib/leaderboard';
import styles from './LeaderboardPage.module.css';

const numberFormat = new Intl.NumberFormat('en-US');

const formatNumber = (value) => numberFormat.format(value);

export default function LeaderboardPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ status: 'loading', survivors: [], error: '' });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/users/leaderboard', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message || 'The survivor roster is unavailable.');
        if (!Array.isArray(data)) throw new Error('The survivor roster returned an unexpected response.');
        return data;
      })
      .then((data) => setState({ status: 'ready', survivors: rankSurvivors(data, LEADERBOARD_LIMIT), error: '' }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ status: 'error', survivors: [], error: error.message || 'Could not load the survivor roster.' });
      });

    return () => controller.abort();
  }, [reloadKey]);

  const { status, survivors, error } = state;
  const podium = survivors.slice(0, 3);

  return (
    <div className={styles.shell}>
      <OceanViewport
        mode="title"
        interactive={false}
        collectiblesEnabled={false}
        fetchStatus={false}
        className={styles.world}
      />

      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>CASTAWAY CHRONICLES / PUBLIC ROSTER</span>
            <p className={styles.brand}>SURVIVOR LEDGER</p>
          </div>
          <div className={styles.actions}>
            <WorldClockBadge compact />
            <Link className={styles.backLink} to="/">BACK TO LOGIN</Link>
          </div>
        </header>

        <section className={styles.hero} aria-labelledby="leaderboard-title">
          <div>
            <span className={styles.sectionKicker}>WHO IS STILL AFLOAT?</span>
            <h1 id="leaderboard-title">The open-ocean leaderboard</h1>
            <p>See how fellow survivors are building their rafts before you set out.</p>
          </div>
          <div className={styles.ruleCard}>
            <span>RANKING ORDER</span>
            <strong>RAFT SIZE</strong>
            <small>Materials break ties</small>
          </div>
        </section>

        {status === 'loading' && (
          <section className={styles.stateCard} aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <p>Reading the latest survivor logs…</p>
          </section>
        )}

        {status === 'error' && (
          <section className={styles.stateCard} role="alert">
            <span className={styles.stateIcon} aria-hidden="true">!</span>
            <h2>Roster offline</h2>
            <p>{error}</p>
            <button type="button" className={styles.retry} onClick={() => setReloadKey((key) => key + 1)}>
              TRY AGAIN
            </button>
          </section>
        )}

        {status === 'ready' && survivors.length === 0 && (
          <section className={styles.stateCard}>
            <span className={styles.stateIcon} aria-hidden="true">◎</span>
            <h2>No survivors logged yet</h2>
            <p>Be the first castaway to claim a place on the ledger.</p>
          </section>
        )}

        {status === 'ready' && survivors.length > 0 && (
          <>
            <section className={styles.podiumSection} aria-labelledby="podium-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.sectionKicker}>THE FRONT THREE</span>
                  <h2 id="podium-title">Current standouts</h2>
                </div>
                <span className={styles.rosterCount}>{survivors.length} SURVIVORS</span>
              </div>

              <div className={styles.podium}>
                {podium.map((survivor, index) => {
                  const place = index + 1;
                  return (
                    <article key={survivor.user_id || survivor.username || place} className={`${styles.podiumCard} ${styles[`place${place}`]}`}>
                      <div className={styles.medal} aria-label={`Rank ${place}`}>{place}</div>
                      <div className={styles.podiumCopy}>
                        <span className={styles.podiumRank}>RANK {String(place).padStart(2, '0')}</span>
                        <h3>{survivor.username || 'Unknown survivor'}</h3>
                        <p>Raft size <strong>{formatNumber(survivor.raft_size)}</strong></p>
                      </div>
                      <span className={styles.podiumMaterials}>{formatNumber(survivor.materials)} <small>MATERIALS</small></span>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className={styles.tableSection} aria-labelledby="roster-title">
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.sectionKicker}>TOP FIVE SURVIVORS</span>
                  <h2 id="roster-title">The top-five ledger</h2>
                </div>
                <span className={styles.sortNote}>TOP 5 / RAFT SIZE</span>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>The top five survivors ranked by raft size and materials</caption>
                  <thead>
                    <tr>
                      <th scope="col">RANK</th>
                      <th scope="col">SURVIVOR</th>
                      <th scope="col">RAFT SIZE</th>
                      <th scope="col">MATERIALS</th>
                      <th scope="col">HUNGER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {survivors.map((survivor, index) => (
                      <tr key={survivor.user_id || survivor.username || index}>
                        <td><span className={styles.rankNumber}>{String(index + 1).padStart(2, '0')}</span></td>
                        <th scope="row">{survivor.username || 'Unknown survivor'}</th>
                        <td><strong>{formatNumber(survivor.raft_size)}</strong><span className={styles.unit}> TILES</span></td>
                        <td>{formatNumber(survivor.materials)}</td>
                        <td>{formatNumber(survivor.hunger)}<span className={styles.unit}> / 100</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer className={styles.footer}>
          <span>TOP FIVE PUBLIC ROSTER</span>
          <Link to="/register">CREATE YOUR SURVIVOR ACCOUNT</Link>
        </footer>
      </main>
    </div>
  );
}
