import styles from './Button.module.css';

/**
 * The one button in the app. Variants cover every action surface so nothing hand-rolls its
 * own button styling: `lantern` (primary/gold), `ghost` (secondary), `danger` (destructive).
 * Renders as <a> when an `href` is passed so nav actions and form actions share one look.
 */
export default function Button({
  variant = 'lantern',
  size = 'md',
  href,
  className = '',
  children,
  loading = false,
  disabled = false,
  ...rest
}) {
  const cls = [styles.btn, styles[variant], styles[size], loading ? styles.loading : '', className]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={loading ? styles.hiddenLabel : ''}>{children}</span>
    </button>
  );
}
