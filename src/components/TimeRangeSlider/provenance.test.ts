import { describe, expect, it, vi } from 'vitest';
import { DateTime, Duration } from 'effect';
import type { RangeValue } from '@react-types/shared';
import {
  SetSelectedDuration,
  SetSelectedStartDateTime,
  UpdateSource,
  reducer,
  toDateUpdateSource,
  withMiddleware,
  type Action,
  type DateUpdateSource,
  type State,
} from './timeSliderReducer';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const identityRounding = (dt: DateTime.DateTime) => dt;

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

const runWith = (state: State, action: Action) => {
  const onDateRangeSelect = vi.fn<(rv: RangeValue<Date>, source: DateUpdateSource) => void>();
  withMiddleware(reducer, onDateRangeSelect, identityRounding)(state, action);
  return onDateRangeSelect;
};

describe('toDateUpdateSource', () => {
  it('names every internal source', () => {
    expect([
      toDateUpdateSource(UpdateSource.ExternalProp),
      toDateUpdateSource(UpdateSource.UserInteraction),
      toDateUpdateSource(UpdateSource.Step),
      toDateUpdateSource(UpdateSource.Animation),
      toDateUpdateSource(UpdateSource.TrackLatestUpdate),
    ]).toEqual(['external', 'user', 'step', 'animation', 'track-latest']);
  });
});

describe('onDateRangeSelect provenance', () => {
  it.each([
    ['a manual scrub', UpdateSource.UserInteraction, 'user'],
    ['a step press', UpdateSource.Step, 'step'],
    ['an animation frame', UpdateSource.Animation, 'animation'],
    ['a track-latest re-base', UpdateSource.TrackLatestUpdate, 'track-latest'],
  ])('reports %s', (_label, updateSource, expected) => {
    const onDateRangeSelect = runWith(
      baseState(),
      SetSelectedStartDateTime({ selectedStartDateTime: at('2026-08-22T12:56:00Z'), updateSource }));

    expect(onDateRangeSelect).toHaveBeenCalledTimes(1);
    expect(onDateRangeSelect.mock.calls[0][1]).toBe(expected);
  });

  it('distinguishes a poll-driven re-base from a scrub to the same instant', () => {
    const target = at('2026-08-22T12:56:00Z');
    const scrub = runWith(baseState(), SetSelectedStartDateTime({
      selectedStartDateTime: target, updateSource: UpdateSource.UserInteraction }));
    const rebase = runWith(baseState(), SetSelectedStartDateTime({
      selectedStartDateTime: target, updateSource: UpdateSource.TrackLatestUpdate }));

    expect(scrub.mock.calls[0][0]).toEqual(rebase.mock.calls[0][0]);
    expect(scrub.mock.calls[0][1]).not.toBe(rebase.mock.calls[0][1]);
  });

  it('reports a width change with its own provenance', () => {
    const onDateRangeSelect = runWith(baseState(), SetSelectedDuration({
      selectedDuration: Duration.minutes(30), updateSource: UpdateSource.UserInteraction }));
    expect(onDateRangeSelect.mock.calls[0][1]).toBe('user');
  });

  it.each([
    ['a scrub', UpdateSource.UserInteraction, false],
    ['a step press', UpdateSource.Step, false],
    ['an animation frame', UpdateSource.Animation, false],
    ['an external prop change', UpdateSource.ExternalProp, true],
    ['a track-latest re-base', UpdateSource.TrackLatestUpdate, true],
  ])('leaves tracking on after %s: %s', (_label, updateSource, stillTracking) => {
    const next = reducer(
      baseState({ isTrackingLatest: true }),
      SetSelectedStartDateTime({ selectedStartDateTime: at('2026-08-22T12:56:00Z'), updateSource }));
    expect(next.isTrackingLatest).toBe(stillTracking);
  });

  it('stays silent when nothing moved', () => {
    const onDateRangeSelect = runWith(baseState(), SetSelectedStartDateTime({
      selectedStartDateTime: at('2026-08-22T13:01:00Z'), updateSource: UpdateSource.UserInteraction }));
    expect(onDateRangeSelect).not.toHaveBeenCalled();
  });
});
