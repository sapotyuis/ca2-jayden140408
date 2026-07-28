import { useCountUp } from '../hooks/useCountUp';
import styles from './StatChip.module.css';

/**
 * A single resource gauge for the top HUD (materials / hunger / raft size). The number eases
 * to its new value via useCountUp and the chip briefly pulses when it changes, so gaining
 * materials out on the water is felt in the HUD, not just silently updated.
 */
export default function StatChip({ icon, value, label, tone = 'default' }) {
  const shown = useCountUp(value);
  return (
    <div className={`${styles.chip} ${styles[tone]}`}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.body}>
        <span className={styles.value} key={value} data-pulse>
          {shown}
        </span>
        <span className={styles.label}>{label}</span>
      </span>
    </div>
  );
}
