import { createContext, useCallback, useContext, useState } from 'react';
import styles from './ToastProvider.module.css';

const ToastContext = createContext(null);

/** useToast() -> pushToast(message, tone) from anywhere under the provider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

let nextId = 0;

/**
 * App-wide toast host. Toasts auto-dismiss; `quest` toasts linger longer since completing a
 * quest is a moment worth reading. One provider at the app root means every page — camp or
 * voyage — surfaces success/error/quest feedback the same way.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message, tone = 'info') => {
      const id = nextId++;
      const ttl = tone === 'quest' ? 6000 : 4200;
      setToasts((list) => [...list, { id, message, tone }]);
      setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      <div className={styles.host} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.tone]}`} onClick={() => remove(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
