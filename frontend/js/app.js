import { createAuthStore } from './lib/authStore';
import { createToastStore } from './lib/toastStore';
import { createWorldClockStore } from './lib/worldClockStore';
import { refreshWorldClocks } from './components/vanilla';

/**
 * Shared bootstrap for each HTML document. Every page gets the same auth, toast, and world-clock
 * behavior, but the browser performs ordinary document navigation between page entrypoints.
 */
export const createPageApp = (renderPage, { protectedPage = false } = {}) => {
  const root = document.getElementById('root');
  if (!root) throw new Error('Castaway Chronicles root element was not found.');

  const auth = createAuthStore();
  if (protectedPage && !auth.getState().isAuthed) {
    window.location.replace('/login.html');
    return {
      auth,
      toast: null,
      worldClock: null,
      dispose: () => {},
    };
  }

  const toast = createToastStore(root);
  const worldClock = createWorldClockStore(auth);
  const unsubscribeClock = worldClock.subscribe((time) => {
    window.__ccWorldTime = time;
    document.documentElement.dataset.phase = time.isDay ? 'day' : 'night';
    document.documentElement.dataset.visualPhase = time.visualPhase;
    refreshWorldClocks(time);
  });
  const unsubscribeAuth = auth.subscribe((state) => {
    if (protectedPage && !state.isAuthed) window.location.replace('/login.html');
  });
  const cleanupPage = renderPage({ root, auth, toast, worldClock });

  return {
    auth,
    toast,
    worldClock,
    dispose: () => {
      cleanupPage?.();
      unsubscribeAuth();
      unsubscribeClock();
      worldClock.dispose();
      toast.dispose();
    },
  };
};
