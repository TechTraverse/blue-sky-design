import { describe, expect, it, vi } from 'vitest';
import { DateTime, Duration } from 'effect';
import type { RangeValue } from '@react-types/shared';
import {
  ResetAll,
  SetAnimationPlayMode,
  SetSelectedStartDateTime,
  SetTrackingLatest,
  StartLoop,
  UpdateSource,
  reducer,
  withMiddleware,
  type DateUpdateSource,
  type State,
} from './timeSliderReducer';
import { AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime) => DateTime.toDate(dt).toISOString();
const identityRounding = (dt: DateTime.DateTime) => dt;

// An instant slider at 13:00 with a loop over 11:00–13:00, playing.
const playing = (overrides: Partial<State> = {}): State => ({
  selectionMode: 'instant',
  timeZone: TimeZone.UTC,
  increment: TimeDuration['5m'],
  viewStartDateTime: at('2026-08-22T10:00:00Z'),
  viewDuration: Duration.hours(4),
  resetStartDateTime: at('2026-08-22T13:00:00Z'),
  resetDuration: Duration.zero,
  selectedStartDateTime: at('2026-08-22T12:00:00Z'),
  selectedDuration: Duration.zero,
  stepCursor: null,
  loopActive: true,
  resetAnimationSpeed: AnimationSpeed['5 min/sec'],
  resetAnimationDuration: Duration.hours(2),
  animationStartDateTime: at('2026-08-22T11:00:00Z'),
  animationDuration: Duration.hours(2),
  animationRequestFrequency: AnimationRequestFrequency['1 fps'],
  animationPlayMode: PlayMode.Play,
  animationSpeed: AnimationSpeed['5 min/sec'],
  isTrackingLatest: false,
  lastKnownLatestDate: null,
  ...overrides,
});

const move = (state: State, time: string, updateSource: UpdateSource) =>
  reducer(state, SetSelectedStartDateTime({ selectedStartDateTime: at(time), updateSource }));

describe('starting playback', () => {
  it('opens the loop at the given start and plays', () => {
    const idle = playing({ loopActive: false, animationPlayMode: PlayMode.Pause });
    const next = reducer(idle, StartLoop({ animationStartDateTime: at('2026-08-22T10:00:00Z') }));
    expect(next.loopActive).toBe(true);
    expect(next.animationPlayMode).toBe(PlayMode.Play);
    expect(iso(next.animationStartDateTime)).toBe('2026-08-22T10:00:00.000Z');
  });

  it('leaves the selection alone, so the consumer hears nothing until the first frame', () => {
    const idle = playing({ loopActive: false, animationPlayMode: PlayMode.Pause });
    const onDateRangeSelect = vi.fn<(rv: RangeValue<Date>, source: DateUpdateSource) => void>();
    const next = withMiddleware(reducer, onDateRangeSelect, identityRounding)(
      idle, StartLoop({ animationStartDateTime: at('2026-08-22T10:00:00Z') }));
    expect(iso(next.selectedStartDateTime)).toBe('2026-08-22T12:00:00.000Z');
    expect(onDateRangeSelect).not.toHaveBeenCalled();
  });

  it('turns tracking off and ends a step sequence', () => {
    const idle = playing({
      loopActive: false,
      animationPlayMode: PlayMode.Pause,
      isTrackingLatest: true,
      stepCursor: at('2026-08-22T12:00:00Z'),
    });
    const next = reducer(idle, StartLoop({ animationStartDateTime: at('2026-08-22T10:00:00Z') }));
    expect(next.isTrackingLatest).toBe(false);
    expect(next.stepCursor).toBeNull();
  });

  it('turns tracking off when play resumes a paused loop', () => {
    const paused = playing({ animationPlayMode: PlayMode.Pause, isTrackingLatest: true });
    const next = reducer(paused, SetAnimationPlayMode({ playMode: PlayMode.Play }));
    expect(next.animationPlayMode).toBe(PlayMode.Play);
    expect(next.isTrackingLatest).toBe(false);
  });
});

describe('a manual move during playback', () => {
  it.each([
    ['a step', UpdateSource.Step],
    ['a drag or typed time', UpdateSource.UserInteraction],
  ])('pauses at the new time on %s inside the loop, and keeps the loop', (_, source) => {
    const next = move(playing(), '2026-08-22T12:30:00Z', source);
    expect(iso(next.selectedStartDateTime)).toBe('2026-08-22T12:30:00.000Z');
    expect(next.animationPlayMode).toBe(PlayMode.Pause);
    expect(next.loopActive).toBe(true);
  });

  it.each([
    ['before', '2026-08-22T10:55:00Z'],
    ['after', '2026-08-22T13:05:00Z'],
  ])('clears the loop when it lands %s it', (_, time) => {
    const next = move(playing(), time, UpdateSource.UserInteraction);
    expect(next.loopActive).toBe(false);
    expect(next.animationPlayMode).toBe(PlayMode.Pause);
  });

  it('keeps the loop at either edge', () => {
    expect(move(playing(), '2026-08-22T11:00:00Z', UpdateSource.Step).loopActive).toBe(true);
    expect(move(playing(), '2026-08-22T13:00:00Z', UpdateSource.Step).loopActive).toBe(true);
  });

  it('clears the loop when stepping out of it while paused', () => {
    const paused = playing({ animationPlayMode: PlayMode.Pause, selectedStartDateTime: at('2026-08-22T13:00:00Z') });
    expect(move(paused, '2026-08-22T13:05:00Z', UpdateSource.Step).loopActive).toBe(false);
  });
});

describe('writes that are not manual moves', () => {
  it('keeps playing through animation frames', () => {
    const next = move(playing(), '2026-08-22T12:05:00Z', UpdateSource.Animation);
    expect(next.animationPlayMode).toBe(PlayMode.Play);
    expect(next.loopActive).toBe(true);
  });

  it('keeps playing when the host echoes a time back, even one outside the loop', () => {
    const next = move(playing(), '2026-08-22T13:30:00Z', UpdateSource.ExternalProp);
    expect(next.animationPlayMode).toBe(PlayMode.Play);
    expect(next.loopActive).toBe(true);
  });

  it('jump to latest pauses and clears the loop', () => {
    const next = move(playing(), '2026-08-22T13:00:00Z', UpdateSource.TrackLatestUpdate);
    expect(next.animationPlayMode).toBe(PlayMode.Pause);
    expect(next.loopActive).toBe(false);
  });

  it('turning tracking on pauses and clears the loop', () => {
    const next = reducer(playing(), SetTrackingLatest({ isTrackingLatest: true }));
    expect(next.animationPlayMode).toBe(PlayMode.Pause);
    expect(next.loopActive).toBe(false);
  });

  it('reset pauses and clears the loop', () => {
    const next = reducer(playing(), ResetAll());
    expect(next.animationPlayMode).toBe(PlayMode.Pause);
    expect(next.loopActive).toBe(false);
  });
});
