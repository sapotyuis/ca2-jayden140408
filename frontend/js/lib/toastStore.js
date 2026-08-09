import styles from '../../css/ToastProvider.module.css';
import { escapeHtml } from './dom';

export const createToastStore = (root) => {
  const host = document.createElement('div');
  host.className = styles.host;
  host.setAttribute('aria-live', 'polite');
  root.append(host);
  let nextId = 0;

  const push = (message, tone = 'info') => {
    const toast = document.createElement('button');
    const id = nextId++;
    toast.type = 'button';
    toast.className = `${styles.toast} ${styles[tone] || styles.info}`;
    toast.textContent = message;
    host.append(toast);
    const remove = () => toast.remove();
    toast.addEventListener('click', remove, { once: true });
    window.setTimeout(remove, tone === 'error' ? 6500 : 4600);
    console.log('[TOAST] displayed', { id, tone, message: escapeHtml(message) });
  };

  return { push, dispose: () => host.remove() };
};
