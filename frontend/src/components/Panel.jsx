import styles from './Panel.module.css';

/**
 * A dark-glass HUD panel — the primary content surface on the dashboard. Reads as a lantern-lit
 * instrument panel on the captain's console rather than a plain web card: gold hairline trim,
 * a faint parchment-textured wash, layered shadow for depth, and a staggered rise-in on mount.
 *
 * `title`/`subtitle`/`action` render a consistent header so no screen hand-builds its own.
 * `index` staggers the entrance animation when several panels mount together.
 */
export default function Panel({ title, subtitle, action, index = 0, wide = false, className = '', children }) {
  return (
    <section
      className={`${styles.panel} ${wide ? styles.wide : ''} ${className}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {(title || action) && (
        <header className={styles.head}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
