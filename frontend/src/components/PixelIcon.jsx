import styles from './PixelIcon.module.css';

const ICON_PATHS = Object.freeze({
  materials: 'materials.png',
  hunger: 'hunger.png',
  raft: 'raft.png',
  'third-person': 'third-person.png',
  'first-person': 'first-person.png',
  sun: 'sun.png',
  moon: 'moon.png',
});

export default function PixelIcon({ name, label = '', className = '' }) {
  const fileName = ICON_PATHS[name] || ICON_PATHS.raft;
  const decorative = !label;
  return (
    <img
      className={`${styles.icon} ${className}`}
      src={`/assets/pixel-icons/${fileName}`}
      alt={decorative ? '' : label}
      aria-hidden={decorative ? 'true' : undefined}
    />
  );
}
