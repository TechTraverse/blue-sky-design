import { describe, expect, it } from 'vitest';
import { DateTime, Duration } from 'effect';
import {
  ResetAll,
  SetSelectedDuration,
  SetSelectedStartDateTime,
  SetTrackingLatest,
  UpdateSource,
  reducer,
  type State,
} from './timeSliderReducer';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));

const baseState = (overrides: Partial<State> = {}): State => ({
  timeZone: TimeZone.Local,
  increment: TimeDuration['5m'],
  viewStartDateTime: at('2026-08-22T11:00:00Z'),
  viewDuration: Duration.hours(4),
  resetStartDateTime: at('2026-08-22T13:01:00Z'),
  resetDuration: Duration.minutes(5),
  selectedStartDateTime: at('2026-08-22T13:01:00Z'),
  selectedDuration: Duration.minutes(5),
  stepCursor: null,
  animationOrStepMode: AnimationOrStepMode.Step,
  resetAnimationSpeed: AnimationSpeed['5 min/sec'],
  resetAnimationDuration: Duration.hours(2),
  animationStartDateTime: at('2026-08-22T13:01:00Z'),
  animationDuration: Duration.hours(2),
  animationRequestFrequency: AnimationRequestFrequency['1 fps'],
  animationPlayMode: PlayMode.Pause,
  animationSpeed: AnimationSpeed['5 min/sec'],
  isTrackingLatest: false,
  lastKnownLatestDate: null,
  ...overrides,
});

const setStart = (iso: string, updateSource: UpdateSource) =>
  SetSelectedStartDateTime({ selectedStartDateTime: at(iso), updateSource });

describe('stepCursor invalidation', () => {
  it('a step write records the cursor and continues the sequence', () => {
    const s1 = reducer(baseState(), setStart('2026-08-22T12:56:00Z', UpdateSource.Step));
    expect(s1.stepCursor && DateTime.toDate(s1.stepCursor).toISOString())
      .toBe('2026-08-22T12:56:00.000Z');
  });

  it.each([
    ['a scrub', UpdateSource.UserInteraction],
    ['an external prop change', UpdateSource.ExternalProp],
  ])('%s ends the sequence', (_label, source) => {
    const active = baseState({ stepCursor: at('2026-08-22T12:56:00Z') });
    expect(reducer(active, setStart('2026-08-22T12:40:00Z', source)).stepCursor).toBeNull();
  });

  it('a track-latest re-base is refused outright while a sequence is active', () => {
    const active = baseState({
      stepCursor: at('2026-08-22T12:56:00Z'),
      selectedStartDateTime: at('2026-08-22T12:56:00Z'),
      isTrackingLatest: true,
    });
    const next = reducer(active, setStart('2026-08-22T13:04:00Z', UpdateSource.TrackLatestUpdate));
    expect(next).toBe(active);
  });

  it('a track-latest re-base applies between sequences', () => {
    const idle = baseState({ isTrackingLatest: true });
    const next = reducer(idle, setStart('2026-08-22T13:04:00Z', UpdateSource.TrackLatestUpdate));
    expect(DateTime.toDate(next.selectedStartDateTime).toISOString())
      .toBe('2026-08-22T13:04:00.000Z');
  });

  it('toggling tracking ends the sequence, so the jump to latest is not refused', () => {
    const active = baseState({ stepCursor: at('2026-08-22T12:56:00Z') });
    const enabled = reducer(active, SetTrackingLatest({ isTrackingLatest: true }));
    expect(enabled.stepCursor).toBeNull();

    const jumped = reducer(enabled, setStart('2026-08-22T13:04:00Z', UpdateSource.TrackLatestUpdate));
    expect(DateTime.toDate(jumped.selectedStartDateTime).toISOString())
      .toBe('2026-08-22T13:04:00.000Z');
  });

  it('a width change ends the sequence, since it can move the lattice', () => {
    const active = baseState({ stepCursor: at('2026-08-22T12:56:00Z') });
    const next = reducer(active, SetSelectedDuration({
      selectedDuration: Duration.minutes(30),
      updateSource: UpdateSource.UserInteraction,
    }));
    expect(next.stepCursor).toBeNull();
  });

  it('reset ends the sequence', () => {
    const active = baseState({ stepCursor: at('2026-08-22T12:56:00Z') });
    expect(reducer(active, ResetAll()).stepCursor).toBeNull();
  });

  it('a step still auto-disables tracking', () => {
    const tracking = baseState({ isTrackingLatest: true });
    expect(reducer(tracking, setStart('2026-08-22T12:56:00Z', UpdateSource.Step)).isTrackingLatest)
      .toBe(false);
  });
});
