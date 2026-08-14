// Calculates the game's repeating day, night, and twilight cycle.
export const DAY_DURATION_MS = 3 * 60 * 1000;
export const CYCLE_DURATION_MS = DAY_DURATION_MS * 2;
export const TWILIGHT_DURATION_MS = 30 * 1000;

const smoothstep = (value) => {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
};

const getDaylight = (cyclePositionMs) => {
  const sunriseStart = DAY_DURATION_MS - TWILIGHT_DURATION_MS;
  const sunriseEnd = DAY_DURATION_MS + TWILIGHT_DURATION_MS;
  const sunsetStart = CYCLE_DURATION_MS - TWILIGHT_DURATION_MS;

  if (cyclePositionMs >= sunriseStart && cyclePositionMs < sunriseEnd) {
    return smoothstep((cyclePositionMs - sunriseStart) / (TWILIGHT_DURATION_MS * 2));
  }

  if (cyclePositionMs >= sunsetStart) {
    return 1 - smoothstep((cyclePositionMs - sunsetStart) / TWILIGHT_DURATION_MS);
  }

  return cyclePositionMs < DAY_DURATION_MS ? 0 : 1;
};

const getVisualPhase = (cyclePositionMs, phase) => {
  const sunriseStart = DAY_DURATION_MS - TWILIGHT_DURATION_MS;
  const sunriseEnd = DAY_DURATION_MS + TWILIGHT_DURATION_MS;
  const sunsetStart = CYCLE_DURATION_MS - TWILIGHT_DURATION_MS;

  if (cyclePositionMs >= sunriseStart && cyclePositionMs < sunriseEnd) return 'dawn';
  if (cyclePositionMs >= sunsetStart) return 'dusk';
  return phase;
};

const toTimestamp = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value);
  return Number.NaN;
};

export const getWorldClockKey = (userId) => `cc_world_clock_${userId}`;

export const getOrCreateWorldStart = (storage, key, nowMs = Date.now()) => {
  const rawStored = storage.getItem(key);
  const stored = rawStored === null ? Number.NaN : Number(rawStored);
  if (Number.isFinite(stored)) return stored;

  storage.setItem(key, String(nowMs));
  return nowMs;
};

export const getWorldTime = (nowMs = Date.now(), startedAtMs = Date.now()) => {
  const now = toTimestamp(nowMs);
  const startedAt = toTimestamp(startedAtMs);
  const hasValidTimestamps = Number.isFinite(now) && Number.isFinite(startedAt) && now >= startedAt;
  const elapsed = hasValidTimestamps ? now - startedAt : 0;
  const cyclePositionMs = elapsed % CYCLE_DURATION_MS;
  const isDay = cyclePositionMs >= DAY_DURATION_MS;
  const phaseElapsedMs = isDay ? cyclePositionMs - DAY_DURATION_MS : cyclePositionMs;
  const phaseDurationMs = DAY_DURATION_MS;
  const phase = isDay ? 'day' : 'night';
  const visualPhase = getVisualPhase(cyclePositionMs, phase);
  const label = visualPhase === 'dawn'
    ? 'Sunrise'
    : visualPhase === 'dusk' ? 'Sunset' : isDay ? 'Daylight' : 'Night watch';

  return {
    phase,
    visualPhase,
    progress: phaseElapsedMs / phaseDurationMs,
    cyclePositionMs,
    secondsRemaining: Math.ceil((phaseDurationMs - phaseElapsedMs) / 1000),
    daylight: getDaylight(cyclePositionMs),
    label,
  };
};
