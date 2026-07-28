import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorldClock } from '../context/WorldClockContext';
import { createOceanScene } from '../ocean/createOceanScene';
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

  const povLabel = pov === 'third' ? '👁 Third Person' : '🧭 First Person';

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
          <p>Casting off…</p>
        </div>
      )}

      <div className={styles.hud}>
        {eventAlert && (
          <div className={`${styles.eventAlert} ${eventAlert.prevented ? styles.eventProtected : styles.eventDanger}`} role="status">
            <div className={styles.eventKicker}>
              {eventAlert.prevented ? 'Defences hold' : 'Unexpected event'}
            </div>
            <div className={styles.eventTitle}>
              {eventAlert.event?.event_name || 'Something is moving in the dark'}
            </div>
            <p className={styles.eventDescription}>
              {eventAlert.message || eventAlert.event?.description || 'The open sea has turned against you.'}
            </p>
            {eventAlert.lost_item && (
              <div className={styles.eventConsequence}>
                Lost {eventAlert.lost_item.item_name} ×{eventAlert.lost_item.quantity}
              </div>
            )}
            {eventAlert.prevented && eventAlert.protection_upgrade_type && (
              <div className={styles.eventConsequence}>
                Protected by {eventAlert.protection_upgrade_type}
              </div>
            )}
          </div>
        )}

        <div className={styles.topRow}>
          <div className={styles.panel}>
            <button className={styles.back} onClick={() => navigate('/camp')}>
              ← Raft Camp
            </button>
            <span className={styles.stats}>
              <span className={styles.stat}>
                🪵<b>{stats.materials}</b>
              </span>
              <span className={styles.stat}>
                🍖<b>{stats.hunger}</b>
              </span>
              <span className={styles.stat}>
                ⛵<b>{stats.raftSize}</b>
              </span>
            </span>
          </div>

          <div className={styles.topActions}>
            <WorldClockBadge compact />
            <button className={styles.pov} onClick={() => sceneRef.current?.togglePov()}>
              {povLabel}
            </button>
          </div>
        </div>

        <p className={`${styles.instructions} ${showInstructions ? '' : styles.instructionsHidden}`}>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> or arrow keys to sail · drag to look around · <kbd>V</kbd> to switch view
          <br />
          Steer into floating salvage — planks, fish, tools, and supplies — to collect it.
        </p>

        <div className={styles.demoPanel} aria-label="Demo event controls">
          <span className={styles.demoLabel}>Demo events</span>
          <button
            type="button"
            className={`${styles.demoButton} ${styles.demoShark}`}
            disabled={loading}
            onClick={() => sceneRef.current?.triggerDemoEvent('shark_attack')}
          >
            Shark
          </button>
          <button
            type="button"
            className={`${styles.demoButton} ${styles.demoTsunami}`}
            disabled={loading}
            onClick={() => sceneRef.current?.triggerDemoEvent('tsunami')}
          >
            Tsunami
          </button>
          <button
            type="button"
            className={`${styles.demoButton} ${styles.demoDownpour}`}
            disabled={loading}
            onClick={() => sceneRef.current?.triggerDemoEvent('heavy_downpour')}
          >
            Downpour
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
