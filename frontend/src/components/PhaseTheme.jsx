import { useEffect } from 'react';
import { useWorldClock } from '../context/WorldClockContext';

/**
 * Drives the app-wide day/night theme. It reads the in-game WorldClock and stamps the current
 * phase onto <html data-phase="day|night">, which every stylesheet keys its palette off (see
 * tokens.css). One attribute, one source of truth — so when the world rolls from day into night,
 * the entire interface changes light with it. Renders nothing.
 */
export default function PhaseTheme() {
  const { isDay, visualPhase, daylight } = useWorldClock();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.phase = isDay ? 'day' : 'night';
    root.dataset.visualPhase = visualPhase;
    root.style.setProperty('--daylight', String(daylight ?? 0));
  }, [isDay, visualPhase, daylight]);

  return null;
}
