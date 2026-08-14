// Schedules unexpected ocean events and connects server event types to their visual effects.
export const EVENT_TRIGGER_MIN_MS = 45_000;
export const EVENT_TRIGGER_MAX_MS = 90_000;

const EVENT_EFFECT_PROFILES = {
  shark_attack: {
    effect: 'shark',
    durationMs: 7_600,
  },
  tsunami: {
    effect: 'tsunami',
    durationMs: 9_000,
  },
  heavy_downpour: {
    effect: 'downpour',
    durationMs: 8_400,
  },
};

const clampRandomValue = (value) => Math.min(0.999999, Math.max(0, Number(value) || 0));

export const getNextUnexpectedEventDelay = (random = Math.random) => {
  const value = clampRandomValue(random());
  return Math.round(
    EVENT_TRIGGER_MIN_MS + value * (EVENT_TRIGGER_MAX_MS - EVENT_TRIGGER_MIN_MS),
  );
};

export const pickUnexpectedEvent = (events, random = Math.random) => {
  const eligibleEvents = (events || []).filter((event) => (
    (event?.is_unexpected === 1 || event?.is_unexpected === true)
    && event?.is_active !== 0
  ));

  if (!eligibleEvents.length) {
    return null;
  }

  const index = Math.min(
    eligibleEvents.length - 1,
    Math.floor(clampRandomValue(random()) * eligibleEvents.length),
  );

  return eligibleEvents[index];
};

export const findUnexpectedEventByType = (events, eventType) => (events || []).find((event) => (
  event?.event_type === eventType
  && (event?.is_unexpected === 1 || event?.is_unexpected === true)
  && event?.is_active !== 0
)) || null;

export const getEventEffectProfile = (eventType) => EVENT_EFFECT_PROFILES[eventType] || null;
