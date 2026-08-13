// Runs the world clock, publishes time updates, and synchronizes day/night DOM attributes.
import { getOrCreateWorldStart, getWorldClockKey, getWorldTime } from './worldClock.js';

export const createWorldClockStore = (authStore) => {
  let now = Date.now();
  let startedAt = Date.now();
  let identity = authStore.getState().user?.user_id || 'guest';
  const listeners = new Set();

  const reset = () => {
    identity = authStore.getState().user?.user_id || 'guest';
    startedAt = getOrCreateWorldStart(localStorage, getWorldClockKey(identity), Date.now());
    now = Date.now();
    listeners.forEach((listener) => listener(getState()));
  };
  const getState = () => {
    const time = getWorldTime(now, startedAt);
    return { ...time, visualPhase: time.visualPhase || time.phase, isDay: time.phase === 'day', clockIdentity: identity };
  };

  const unsubscribeAuth = authStore.subscribe(reset);
  reset();
  const interval = window.setInterval(() => {
    now = Date.now();
    document.documentElement.dataset.phase = getState().isDay ? 'day' : 'night';
    document.documentElement.dataset.visualPhase = getState().visualPhase;
    listeners.forEach((listener) => listener(getState()));
  }, 1000);

  return {
    getState,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
    dispose: () => {
      unsubscribeAuth();
      window.clearInterval(interval);
      listeners.clear();
    },
  };
};
