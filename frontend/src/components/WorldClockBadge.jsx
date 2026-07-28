import { useWorldClock } from '../context/WorldClockContext';
import styles from './WorldClockBadge.module.css';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export default function WorldClockBadge({ compact = false }) {
  const { visualPhase, label, progress, secondsRemaining } = useWorldClock();

  return (
    <div className={`${styles.clock} ${compact ? styles.compact : ''} ${styles[visualPhase]}`}>
      <span className={styles.icon} aria-hidden="true">{visualPhase === 'day' || visualPhase === 'dawn' ? '☼' : '☾'}</span>
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        <strong>{formatTime(secondsRemaining)}</strong>
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${Math.max(3, progress * 100)}%` }} />
      </span>
    </div>
  );
}
