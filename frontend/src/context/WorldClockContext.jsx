import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getOrCreateWorldStart, getWorldClockKey, getWorldTime } from '../lib/worldClock';

const WorldClockContext = createContext(null);

export function useWorldClock() {
  const context = useContext(WorldClockContext);
  if (!context) throw new Error('useWorldClock must be used within <WorldClockProvider>');
  return context;
}

export function WorldClockProvider({ children }) {
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const clockIdentity = user?.user_id || 'guest';

  useEffect(() => {
    const key = getWorldClockKey(clockIdentity);
    const nextStart = getOrCreateWorldStart(window.localStorage, key, Date.now());

    setStartedAt(nextStart);
    setNow(Date.now());

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [clockIdentity]);

  const time = useMemo(() => getWorldTime(now, startedAt), [now, startedAt]);
  const visualPhase = time.visualPhase || time.phase;

  const value = useMemo(
    () => ({
      ...time,
      visualPhase,
      isDay: time.phase === 'day',
      clockIdentity,
    }),
    [time, visualPhase, clockIdentity]
  );

  return <WorldClockContext.Provider value={value}>{children}</WorldClockContext.Provider>;
}
