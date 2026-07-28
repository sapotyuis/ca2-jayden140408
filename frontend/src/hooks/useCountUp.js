import { useEffect, useRef, useState } from 'react';

/**
 * Eases a displayed number toward `target` over `duration` ms whenever the target changes,
 * so a resource counter climbing after a catch feels like a gauge ticking up rather than a
 * value blinking to a new number. Returns the current animated value (rounded).
 *
 * Uses requestAnimationFrame and always animates from wherever the display currently is, so
 * rapid successive changes chain smoothly instead of restarting from zero each time.
 */
export function useCountUp(target, duration = 600) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const from = fromRef.current;
    const delta = target - from;

    if (delta === 0) return undefined;

    const tick = (now) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min((now - startRef.current) / duration, 1);
      // easeOutCubic — quick to move, gentle to settle.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    // Safety net: if requestAnimationFrame is throttled (a backgrounded/inactive tab), the
    // eased frames never arrive and the counter would stick at its old value. A timer set a
    // hair past the duration snaps it to the true target regardless — timers aren't throttled
    // as aggressively as rAF — so the number is always correct, animated or not.
    const settle = setTimeout(() => setDisplay(target), duration + 60);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(settle);
    };
    // Intentionally keyed only on target: we snapshot `display` into `from` at the start of
    // each new animation, and don't want an in-flight frame update to retrigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}
