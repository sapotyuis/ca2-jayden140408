import styles from './Meter.module.css';

/**
 * A labelled progress meter whose fill animates to its new width via a CSS transition,
 * so a stat changing (hunger dropping, quest progress ticking up) reads as motion rather
 * than a silent jump. `tone` swaps the fill gradient for different resource types.
 */
export default function Meter({ label, value, max = 100, valueText, tone = 'lantern', compact = false }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`${styles.meter} ${compact ? styles.compact : ''}`}>
      {label && (
        <div className={styles.labelRow}>
          <span>{label}</span>
          {valueText !== undefined && <span className={styles.value}>{valueText}</span>}
        </div>
      )}
      <div className={styles.track}>
        <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
