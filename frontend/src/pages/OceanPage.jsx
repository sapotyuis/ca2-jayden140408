import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorldClock } from '../context/WorldClockContext';
import { createOceanScene } from '../ocean/createOceanScene';
import PixelIcon from '../components/PixelIcon';
import WorldClockBadge from '../components/WorldClockBadge';
import styles from './OceanPage.module.css';

let logId = 0;

/**
 * Ocean Voyage — the 3D sailing view. React owns the HUD (stats, catch log, POV toggle,
 * instructions, loading veil) as ordinary state; the imperative Three.js scene lives in
 * createOceanScene and talks back through callbacks. The scene is created once on mount and
 * torn down on unmount, so navigating back to camp fully releases the WebGL context.
 */
export default function OceanPage() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const { api } = useAuth();
  const worldTime = useWorldClock();
  // Keep the scene calling the latest api without rebuilding the whole scene when the auth
  // context's api identity changes — the 3D world should mount exactly once.
  const apiRef = useRef(api);
  apiRef.current = api;
  const worldTimeRef = useRef(worldTime);
  worldTimeRef.current = worldTime;
  const navigate = useNavigate();

  const [stats, setStats] = useState({ materials: 0, hunger: 0, raftSize: 1 });
  const [pov, setPov] = useState('third');
  const [showInstructions, setShowInstructions] = useState(true);
  const [reticleActive, setReticleActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState([]);
  const [eventAlert, setEventAlert] = useState(null);
  const eventAlertTimerRef = useRef(null);

  const pushLog = (text, tone) => {
    const id = logId++;
    setLog((entries) => [{ id, text, tone }, ...entries].slice(0, 5));
    setTimeout(() => setLog((entries) => entries.filter((e) => e.id !== id)), 4600);
  };

  useEffect(() => {
    const scene = createOceanScene({
      canvas: canvasRef.current,
      api: (path, opts) => apiRef.current(path, opts),
      getWorldTime: () => worldTimeRef.current,
      onStatus: (next) => setStats((prev) => ({ ...prev, ...next })),
      onLog: (text, tone) => pushLog(text, tone),
      onInteract: () => setShowInstructions(false),
      onPovChange: (mode) => setPov(mode),
      onReticle: (active) => setReticleActive(active),
      onUnexpectedEvent: (event) => {
        setEventAlert(event);
        if (eventAlertTimerRef.current) clearTimeout(eventAlertTimerRef.current);
        eventAlertTimerRef.current = setTimeout(() => setEventAlert(null), 7600);
      },
      onReady: () => setLoading(false),
    });
    sceneRef.current = scene;
    return () => {
      if (eventAlertTimerRef.current) clearTimeout(eventAlertTimerRef.current);
      scene.dispose();
    };
  }, []);

  const povIcon = pov === 'third' ? 'third-person' : 'first-person';
  const povLabel = pov === 'third' ? 'VIEW: THIRD PERSON' : 'VIEW: FIRST PERSON';

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.vignette} aria-hidden="true" />
      <div
        className={`${styles.reticle} ${pov === 'first' ? styles.reticleVisible : ''} ${reticleActive ? styles.reticleActive : ''}`}
        aria-hidden="true"
      />

      {loading && (
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden="true" />
          <p>Loading your voyage…</p>
        </div>
      )}

      <div className={styles.hud}>
        {eventAlert && (
          <div className={`${styles.eventAlert} ${eventAlert.prevented ? styles.eventProtected : styles.eventDanger}`} role="status">
            <div className={styles.eventKicker}>
              {eventAlert.prevented ? 'Defence successful' : 'DANGER ALERT'}
            </div>
            <div className={styles.eventTitle}>
              {eventAlert.event?.event_name || 'Danger approaching'}
            </div>
            <p className={styles.eventDescription}>
              {eventAlert.message || eventAlert.event?.description || 'An unexpected hazard is threatening your raft.'}
            </p>
            {eventAlert.lost_item && (
              <div className={styles.eventConsequence}>
                Lost item: {eventAlert.lost_item.item_name} ×{eventAlert.lost_item.quantity}
              </div>
            )}
            {eventAlert.prevented && eventAlert.protection_upgrade_type && (
              <div className={styles.eventConsequence}>
                Protection used: {eventAlert.protection_upgrade_type}
              </div>
            )}
          </div>
        )}

        <div className={styles.topRow}>
          <div className={styles.panel}>
            <button className={styles.back} onClick={() => navigate('/camp')}>
              ← BACK TO RAFT CAMP
            </button>
            <span className={styles.stats}>
              <span className={styles.stat}>
                <PixelIcon name="materials" />
                <b>{stats.materials}</b>
              </span>
              <span className={styles.stat}>
                <PixelIcon name="hunger" />
                <b>{stats.hunger}</b>
              </span>
              <span className={styles.stat}>
                <PixelIcon name="raft" />
                <b>{stats.raftSize}</b>
              </span>
            </span>
          </div>

          <div className={styles.topActions}>
            <WorldClockBadge compact />
            <button className={styles.pov} onClick={() => sceneRef.current?.togglePov()}>
              <PixelIcon name={povIcon} />
              <span>{povLabel}</span>
            </button>
          </div>
        </div>

        <p className={`${styles.instructions} ${showInstructions ? '' : styles.instructionsHidden}`}>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> or the arrow keys to move the raft · drag to look around · press <kbd>V</kbd> to change view
          <br />
          Sail over floating debris to collect planks, fish, tools, and supplies.
        </p>

        <div className={styles.demoPanel} aria-label="Test hazard controls">
          <span className={styles.demoLabel}>TEST AN EVENT</span>
          <button
            type="button"
            className={`${styles.demoButton} ${styles.demoShark}`}
            disabled={loading}
            aria-label="Test a shark attack"
            onClick={() => sceneRef.current?.triggerDemoEvent('shark_attack')}
          >
            SHARK ATTACK
          </button>
          <button
            type="button"
            className={`${styles.demoButton} ${styles.demoTsunami}`}
            disabled={loading}
            aria-label="Test a tsunami wave"
            onClick={() => sceneRef.current?.triggerDemoEvent('tsunami')}
          >
            TSUNAMI WAVE
          </button>
          <button
            type="button"
            className={`${styles.demoButton} ${styles.demoDownpour}`}
            disabled={loading}
            aria-label="Test heavy rain"
            onClick={() => sceneRef.current?.triggerDemoEvent('heavy_downpour')}
          >
            HEAVY RAIN
          </button>
        </div>

        <div className={styles.log}>
          {log.map((entry) => (
            <div key={entry.id} className={`${styles.logEntry} ${styles[`log_${entry.tone}`] || ''}`}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
