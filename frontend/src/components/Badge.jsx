import styles from './Badge.module.css';

/** Small status pill (quest state, upgrade "installed", etc.). `tone` sets the colour. */
export default function Badge({ tone = 'neutral', children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
