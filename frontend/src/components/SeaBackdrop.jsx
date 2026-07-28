import styles from './SeaBackdrop.module.css';
import { useWorldClock } from '../context/WorldClockContext';

/**
 * The living night-ocean backdrop shared by every screen — starfield, a low moon and its
 * broken silver path, three parallax wave bands, and (optionally) the drifting raft with its
 * one lit lantern. Purely atmospheric, so the whole layer is hidden from assistive tech.
 *
 * Making this a single shared component (rather than re-declaring the scene per page) is what
 * keeps the app feeling like one continuous world as you move between login, camp, and voyage.
 *
 * @param {'dawn'|'night'} [tone] shifts the horizon warmth so related pages differ subtly.
 * @param {boolean} [showRaft] draws the drifting raft silhouette.
 * @param {'ambient'|'camp'} [mode] controls whether the raft is an atmospheric accent or the
 *   centered focal point of the camp scene.
 */
export default function SeaBackdrop({ tone = 'night', showRaft = true, mode = 'ambient' }) {
  const { visualPhase, daylight = 0 } = useWorldClock();
  const light = Math.min(1, Math.max(0, daylight));

  return (
    <div
      className={`${styles.sea} ${styles[visualPhase]} ${styles[mode] || ''} ${tone === 'dawn' ? styles.registerTone : ''}`}
      style={{
        '--star-opacity': 0.8 - (light * 0.72),
        '--orb-size': `${96 + (light * 22)}px`,
      }}
      aria-hidden="true"
    >
      <div className={styles.sky} />
      <div className={styles.stars} />
      <div className={styles.shooting} />
      <div className={styles.moon} />
      <div className={styles.water} />
      <div className={styles.glare} />

      <div className={`${styles.wave} ${styles.wave1}`}>
        <svg viewBox="0 0 2880 90" preserveAspectRatio="none" focusable="false">
          <path d="M0 46 Q180 30 360 46 T720 46 T1080 46 T1440 46 T1800 46 T2160 46 T2520 46 T2880 46 V90 H0 Z" />
        </svg>
      </div>

      {showRaft && (
        <div className={styles.raft}>
          <svg viewBox="0 0 360 240" focusable="false">
            <defs>
              <radialGradient id="cc-lantern-halo">
                <stop offset="0%" stopColor="#f2b556" stopOpacity="0.55" />
                <stop offset="45%" stopColor="#f2b556" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#f2b556" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="cc-reflection-fade" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id="cc-reflection-mask">
                <rect x="0" y="0" width="360" height="240" fill="url(#cc-reflection-fade)" />
              </mask>

              <g id="cc-raft-shape">
                <rect x="70" y="140" width="52" height="11" rx="2" fill="#0b141b" />
                <rect x="118" y="138" width="60" height="13" rx="2" fill="#0d1720" />
                <rect x="174" y="141" width="48" height="11" rx="2" fill="#0b141b" />
                <rect x="218" y="139" width="56" height="12" rx="2" fill="#0d1720" />
                <rect x="270" y="141" width="26" height="10" rx="2" fill="#0b141b" />
                <rect x="240" y="116" width="20" height="24" rx="3" fill="#0b141b" />
                <path d="M240 124 h20 M240 132 h20" stroke="#111f2b" strokeWidth="1.4" />
                <rect x="212" y="126" width="16" height="14" rx="1" fill="#0d1720" />
                <path d="M148 140 L136 26" stroke="#0b141b" strokeWidth="5" strokeLinecap="round" />
                <path d="M139 50 L214 84" stroke="#0b141b" strokeWidth="3" strokeLinecap="round" />
                <path d="M141 56 L206 84 L146 116 Z" fill="#101c26" />
                <path d="M141 56 L179 72 L144 92 Z" fill="#16242f" />
                <path d="M136 28 L74 140 M136 28 L226 138" stroke="#0f1c26" strokeWidth="1.2" fill="none" />
                <path d="M144 96 L172 102 L172 110" stroke="#0b141b" strokeWidth="2" fill="none" />
                <circle className={styles.lanternGlow} cx="172" cy="115" r="22" fill="url(#cc-lantern-halo)" />
                <rect x="168" y="110" width="8" height="10" rx="2" fill="#0b141b" />
                <circle cx="172" cy="115" r="2.6" fill="#f2b556" />
              </g>
            </defs>

            <use href="#cc-raft-shape" />
            <g transform="translate(0 304) scale(1 -1)" opacity="0.16" mask="url(#cc-reflection-mask)">
              <use href="#cc-raft-shape" />
            </g>
            <ellipse cx="172" cy="160" rx="26" ry="6" fill="#f2b556" opacity="0.14" />
          </svg>
        </div>
      )}

      <div className={`${styles.wave} ${styles.wave2}`}>
        <svg viewBox="0 0 2880 90" preserveAspectRatio="none" focusable="false">
          <path d="M0 42 Q180 64 360 42 T720 42 T1080 42 T1440 42 T1800 42 T2160 42 T2520 42 T2880 42 V90 H0 Z" />
        </svg>
      </div>
      <div className={`${styles.wave} ${styles.wave3}`}>
        <svg viewBox="0 0 2880 90" preserveAspectRatio="none" focusable="false">
          <path d="M0 40 Q180 18 360 40 T720 40 T1080 40 T1440 40 T1800 40 T2160 40 T2520 40 T2880 40 V90 H0 Z" />
        </svg>
      </div>

      <div className={styles.vignette} />
    </div>
  );
}
