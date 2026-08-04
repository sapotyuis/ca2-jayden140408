import OceanViewport from '../components/OceanViewport';
import WorldClockBadge from '../components/WorldClockBadge';
import styles from './AuthShell.module.css';

/**
 * Shared scaffold for the two auth screens: the living sea on the left telling the story, the
 * parchment logbook card on the right holding the form. Both pages share this so login and
 * register are unmistakably the same book opened to different pages.
 */
export default function AuthShell({ tone = 'night', status, title, lede, children, footer }) {
  return (
    <>
      <OceanViewport
        mode="title"
        interactive={false}
        collectiblesEnabled={false}
        fetchStatus={false}
        className={tone === 'dawn' ? styles.registerWorld : ''}
      />
      <main className={styles.spread}>
        <aside className={styles.scene} aria-hidden="true">
          <div className={styles.sceneInner}>
            <div className={styles.signalBar}>
              <span>CASTAWAY CHRONICLES</span>
              <span>WORLD 01 / OPEN OCEAN</span>
            </div>
            <p className={styles.eyebrow}>RAFT SURVIVAL GAME / PLAYER ACCOUNT</p>
            <h1 className={styles.brand}>
              Castaway
              <br />
              Chronicles
            </h1>
            <p className={styles.atmos}>&ldquo;Every survivor starts with a single plank.&rdquo;</p>
            <div className={styles.sceneRule} />
            <div className={styles.sceneStats}>
              <div>
                <span>CURRENT LOCATION</span>
                <strong>OPEN OCEAN</strong>
              </div>
              <div>
                <span>OBJECTIVE</span>
                <strong>STAY AFLOAT</strong>
              </div>
              <div>
                <span>THREAT LEVEL</span>
                <strong>UNKNOWN</strong>
              </div>
            </div>
          </div>
        </aside>

        <section className={styles.log} aria-labelledby="auth-title">
          <div className={styles.clockDock}>
            <WorldClockBadge compact />
          </div>
          <div className={styles.board}>
            <div className={styles.paper}>
              <span className={styles.clip} aria-hidden="true" />
              {status && <p className={styles.status}>{status}</p>}
              <h2 id="auth-title" className={styles.logTitle}>
                {title}
              </h2>
              {lede && <p className={styles.lede}>{lede}</p>}
              <div className={styles.rule} aria-hidden="true" />
              {children}
              {footer && <p className={styles.switch}>{footer}</p>}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
