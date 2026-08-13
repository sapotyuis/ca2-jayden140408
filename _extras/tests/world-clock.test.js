import {
  CYCLE_DURATION_MS,
  DAY_DURATION_MS,
  TWILIGHT_DURATION_MS,
  getWorldClockKey,
  getOrCreateWorldStart,
  getWorldTime,
} from '../../public/js/lib/worldClock.js';

describe('world clock', () => {
  it('starts in night and counts down three minutes', () => {
    const time = getWorldTime(0, 0);

    expect(time.phase).toBe('night');
    expect(time.progress).toBe(0);
    expect(time.secondsRemaining).toBe(180);
    expect(time.daylight).toBe(0);
    expect(time.label).toBe('Night watch');
  });

  it('uses a gradual sunrise around the three-minute boundary', () => {
    const sunriseStart = getWorldTime(DAY_DURATION_MS - TWILIGHT_DURATION_MS, 0);
    const time = getWorldTime(DAY_DURATION_MS, 0);
    const sunriseEnd = getWorldTime(DAY_DURATION_MS + TWILIGHT_DURATION_MS, 0);

    expect(sunriseStart.phase).toBe('night');
    expect(sunriseStart.visualPhase).toBe('dawn');
    expect(sunriseStart.daylight).toBe(0);
    expect(sunriseStart.label).toBe('Sunrise');
    expect(time.phase).toBe('day');
    expect(time.progress).toBe(0);
    expect(time.secondsRemaining).toBe(180);
    expect(time.visualPhase).toBe('dawn');
    expect(time.daylight).toBe(0.5);
    expect(sunriseEnd.visualPhase).toBe('day');
    expect(sunriseEnd.daylight).toBe(1);
  });

  it('uses a gradual sunset as the cycle wraps into night', () => {
    const sunsetStart = getWorldTime(CYCLE_DURATION_MS - TWILIGHT_DURATION_MS, 0);
    const sunsetMiddle = getWorldTime(CYCLE_DURATION_MS - (TWILIGHT_DURATION_MS / 2), 0);
    const night = getWorldTime(TWILIGHT_DURATION_MS, 0);

    expect(sunsetStart.phase).toBe('day');
    expect(sunsetStart.visualPhase).toBe('dusk');
    expect(sunsetStart.daylight).toBe(1);
    expect(sunsetMiddle.visualPhase).toBe('dusk');
    expect(sunsetMiddle.daylight).toBeCloseTo(0.5, 2);
    expect(sunsetMiddle.label).toBe('Sunset');
    expect(night.phase).toBe('night');
    expect(night.visualPhase).toBe('night');
    expect(night.daylight).toBe(0);
  });

  it('wraps back to night after a complete six-minute cycle', () => {
    const time = getWorldTime(CYCLE_DURATION_MS + 30_000, 0);

    expect(time.phase).toBe('night');
    expect(time.progress).toBe(1 / 6);
    expect(time.secondsRemaining).toBe(150);
    expect(time.daylight).toBe(0);
  });

  it('returns a user-scoped storage key', () => {
    expect(getWorldClockKey(1)).toBe('cc_world_clock_1');
  });

  it('falls back to a fresh night when timestamps are invalid', () => {
    const time = getWorldTime(Number.NaN, 'not-a-date');

    expect(time.phase).toBe('night');
    expect(time.progress).toBe(0);
    expect(time.secondsRemaining).toBe(180);
    expect(time.daylight).toBe(0);
  });

  it('creates a start timestamp once and reuses it on later loads', () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
    const key = getWorldClockKey(1);

    expect(getOrCreateWorldStart(storage, key, 1234)).toBe(1234);
    expect(getOrCreateWorldStart(storage, key, 9999)).toBe(1234);
    expect(values.get(key)).toBe('1234');
  });
});
