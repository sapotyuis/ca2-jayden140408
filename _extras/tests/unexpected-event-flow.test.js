import {
  EVENT_TRIGGER_MAX_MS,
  EVENT_TRIGGER_MIN_MS,
  findUnexpectedEventByType,
  getEventEffectProfile,
  getNextUnexpectedEventDelay,
  pickUnexpectedEvent,
} from '../../public/js/voyage/oceanEventScheduler.js';

describe('automatic unexpected event flow', () => {
  it('schedules events inside the intended sailing interval', () => {
    expect(getNextUnexpectedEventDelay(() => 0)).toBe(EVENT_TRIGGER_MIN_MS);
    expect(getNextUnexpectedEventDelay(() => 0.999999)).toBeLessThanOrEqual(EVENT_TRIGGER_MAX_MS);
    expect(getNextUnexpectedEventDelay(() => 0.5)).toBeGreaterThan(EVENT_TRIGGER_MIN_MS);
  });

  it('chooses only active unexpected events from the backend catalogue', () => {
    const events = [
      { event_id: 1, event_type: 'discovery', is_unexpected: 0, is_active: 1 },
      { event_id: 2, event_type: 'shark_attack', is_unexpected: 1, is_active: 0 },
      { event_id: 3, event_type: 'tsunami', is_unexpected: 1, is_active: 1 },
    ];

    expect(pickUnexpectedEvent(events, () => 0)).toEqual(events[2]);
    expect(pickUnexpectedEvent([], () => 0)).toBeNull();
  });

  it('maps every supported event to a cinematic 3D effect profile', () => {
    expect(getEventEffectProfile('shark_attack')).toMatchObject({ effect: 'shark', durationMs: 7600 });
    expect(getEventEffectProfile('tsunami')).toMatchObject({ effect: 'tsunami', durationMs: 9000 });
    expect(getEventEffectProfile('heavy_downpour')).toMatchObject({ effect: 'downpour', durationMs: 8400 });
    expect(getEventEffectProfile('unknown')).toBeNull();
  });

  it('finds a server-authored event for each demo control', () => {
    const events = [
      { event_id: 1, event_type: 'discovery', is_unexpected: 0, is_active: 1 },
      { event_id: 2, event_type: 'tsunami', is_unexpected: 1, is_active: 1 },
    ];

    expect(findUnexpectedEventByType(events, 'tsunami')).toEqual(events[1]);
    expect(findUnexpectedEventByType(events, 'shark_attack')).toBeNull();
  });
});
