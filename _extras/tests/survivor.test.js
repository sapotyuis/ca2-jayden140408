import { describe, expect, it } from 'vitest';
import { SURVIVOR_HEIGHT, SURVIVOR_STATES, SURVIVOR_WIDTH, getSurvivorFrame, resolveSurvivorState } from '../../frontend/src/ocean/survivor.js';

describe('survivor state machine', () => {
  it('only ever returns a declared state', () => {
    const inputs = [
      {}, { moving: true }, { collecting: true }, { daylight: 0 }, { interactive: false },
      { mode: 'camp' }, { mode: 'camp', daylight: 0 }, { eventType: 'shark_attack' },
      { eventType: 'tsunami' }, { eventType: 'heavy_downpour' }, { eventType: 'unknown_event' },
    ];
    for (const input of inputs) {
      expect(SURVIVOR_STATES).toContain(resolveSurvivorState(input));
    }
  });

  it('puts danger above everything else', () => {
    expect(resolveSurvivorState({ eventType: 'shark_attack', collecting: true, moving: true })).toBe('shark_reaction');
    expect(resolveSurvivorState({ eventType: 'tsunami', collecting: true, moving: true })).toBe('bracing');
    expect(resolveSurvivorState({ eventType: 'heavy_downpour', collecting: true })).toBe('bracing');
  });

  it('puts collecting above sailing', () => {
    expect(resolveSurvivorState({ collecting: true, moving: true })).toBe('collecting');
  });

  it('reads the raft moving as scanning the horizon', () => {
    expect(resolveSurvivorState({ moving: true })).toBe('looking_out');
  });

  it('falls back to idle by day and sleeping by night when nothing is happening', () => {
    expect(resolveSurvivorState({ daylight: 1 })).toBe('idle');
    expect(resolveSurvivorState({ daylight: 0 })).toBe('sleeping');
  });

  it('has camp working rather than sailing, because nobody is steering there', () => {
    expect(resolveSurvivorState({ mode: 'camp', interactive: false, daylight: 1 })).toBe('crafting');
    expect(resolveSurvivorState({ mode: 'camp', interactive: false, daylight: 0 })).toBe('sleeping');
    // Movement is meaningless in a non-interactive scene and must not leak a sailing pose into it.
    expect(resolveSurvivorState({ mode: 'camp', interactive: false, moving: true })).toBe('crafting');
  });

  it('treats an unrecognised event as no event rather than throwing', () => {
    expect(resolveSurvivorState({ eventType: 'meteor_strike', moving: true })).toBe('looking_out');
  });

  it('keeps the sprite small enough that the raft stays visually dominant', () => {
    expect(SURVIVOR_WIDTH).toBe(24);
    expect(SURVIVOR_HEIGHT).toBe(32);
  });
});

describe('frame-limited animation', () => {
  it('stays inside the frame count for every state', () => {
    for (const state of SURVIVOR_STATES) {
      for (let ms = 0; ms < 4000; ms += 37) {
        const frame = getSurvivorFrame(state, ms);
        expect(Number.isInteger(frame)).toBe(true);
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThan(4);
      }
    }
  });

  it('steps rather than sliding — a frame is held across many milliseconds', () => {
    // Hauling runs at 8fps, so a frame lasts 125ms.
    expect(getSurvivorFrame('collecting', 0)).toBe(getSurvivorFrame('collecting', 100));
    expect(getSurvivorFrame('collecting', 0)).not.toBe(getSurvivorFrame('collecting', 130));
  });

  it('cycles back to the first frame', () => {
    expect(getSurvivorFrame('collecting', 0)).toBe(getSurvivorFrame('collecting', 500));
  });

  it('survives a negative or unknown input', () => {
    expect(getSurvivorFrame('idle', -1000)).toBe(0);
    expect(getSurvivorFrame('nonsense', 500)).toBeGreaterThanOrEqual(0);
  });
});
