import { describe, expect, it, vi } from 'vitest';
import { DateTime, Duration } from 'effect';
import type { RangeValue } from '@react-types/shared';
import { clampSelection } from './stepping';
import {
  ClampSelection,
  ExtSetSelectedStartDateTime,
  UpdateSource,
  reducer,
  withMiddleware,
  type DateUpdateSource,
  type State,
} from './timeSliderReducer';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime) => DateTime.toDate(dt).toISOString();
const identityRounding = (dt: DateTime.DateTime) => dt;

const LATEST = '2026-08-22T13:05:31Z';
const DAY_BEFORE = '2026-08-21T13:05:31Z';
const width = Duration.minutes(5);

/** Clamp and render the result as ISO strings, or undefined when nothing moved. */
const clamp = (start: string, w: Duration.Duration, range: { min?: string; max?: string } | undefined) => {
  const result = clampSelection(at(start), w, range && {
    min: range.min ? at(range.min) : undefined,
    max: range.max ? at(range.max) : undefined,
  });
  return result && {
    start: iso(result.start),
    end: iso(DateTime.addDuration(result.start, result.width)),
  };
};

describe('clampSelection', () => {
  it('leaves a selection inside the range alone', () => {
    expect(clamp('2026-08-22T12:00:00Z', width, { min: DAY_BEFORE, max: LATEST })).toBeUndefined();
  });

  it('leaves a selection touching both bounds alone', () => {
    expect(clamp('2026-08-22T13:00:31Z', width, { max: LATEST })).toBeUndefined();
    expect(clamp(DAY_BEFORE, width, { min: DAY_BEFORE })).toBeUndefined();
  });

  it('lifts a selection the floor moved past onto the floor, keeping its width', () => {
    // The simple view's floor trails the ceiling by 24 hours, so a selection left
    // in place drifts below it as the ceiling advances.
    expect(clamp('2026-08-21T09:00:00Z', width, { min: DAY_BEFORE, max: LATEST })).toEqual({
      start: '2026-08-21T13:05:31.000Z',
      end: '2026-08-21T13:10:31.000Z',
    });
  });

  it('drops a selection above a ceiling that moved back so it ends on the ceiling', () => {
    // A failed poll falls back to an older latest instant.
    expect(clamp('2026-08-22T13:30:00Z', Duration.minutes(30), { max: LATEST })).toEqual({
      start: '2026-08-22T12:35:31.000Z',
      end: '2026-08-22T13:05:31.000Z',
    });
  });

  it('pulls back a selection that only straddles the ceiling', () => {
    expect(clamp('2026-08-22T13:03:00Z', width, { max: LATEST })).toEqual({
      start: '2026-08-22T13:00:31.000Z',
      end: '2026-08-22T13:05:31.000Z',
    });
  });

  it('cuts the width down to the range when the range is narrower than the selection', () => {
    expect(clamp('2026-08-22T10:00:00Z', Duration.hours(4), {
      min: '2026-08-22T12:05:31Z', max: LATEST,
    })).toEqual({
      start: '2026-08-22T12:05:31.000Z',
      end: '2026-08-22T13:05:31.000Z',
    });
  });

  it('applies no bound on an open end', () => {
    // Standard view: no floor, so history at any depth stays where it is.
    expect(clamp('1996-01-01T00:00:00Z', width, { max: LATEST })).toBeUndefined();
    expect(clamp('2036-01-01T00:00:00Z', width, { min: DAY_BEFORE })).toBeUndefined();
    expect(clamp('1996-01-01T00:00:00Z', width, {})).toBeUndefined();
    expect(clamp('1996-01-01T00:00:00Z', width, undefined)).toBeUndefined();
  });

  it('ignores an inverted range', () => {
    expect(clamp('2026-08-22T12:00:00Z', width, { min: LATEST, max: DAY_BEFORE })).toBeUndefined();
  });

  it('is idempotent, so applying it again is a no-op', () => {
    const range = { min: at(DAY_BEFORE), max: at(LATEST) };
    const once = clampSelection(at('2026-08-20T00:00:00Z'), width, range)!;
    expect(clampSelection(once.start, once.width, range)).toBeUndefined();
  });
});

const baseState = (overrides: Partial<State> = {}): State => ({
  timeZone: TimeZone.Local,
  increment: TimeDuration['5m'],
  viewStartDateTime: at('2026-08-22T11:00:00Z'),
  viewDuration: Duration.hours(4),
  resetStartDateTime: at('2026-08-22T13:00:31Z'),
  resetDuration: width,
  selectedStartDateTime: at('2026-08-22T13:30:00Z'),
  selectedDuration: Duration.minutes(30),
  stepCursor: at('2026-08-22T13:30:00Z'),
  animationOrStepMode: AnimationOrStepMode.Step,
  resetAnimationSpeed: AnimationSpeed['5 min/sec'],
  resetAnimationDuration: Duration.hours(2),
  animationStartDateTime: at('2026-08-22T13:30:00Z'),
  animationDuration: Duration.hours(2),
  animationRequestFrequency: AnimationRequestFrequency['1 fps'],
  animationPlayMode: PlayMode.Pause,
  animationSpeed: AnimationSpeed['5 min/sec'],
  isTrackingLatest: true,
  lastKnownLatestDate: null,
  ...overrides,
});

describe('ClampSelection', () => {
  // A ceiling that dropped back to LATEST after a failed poll, floor open.
  const ceiling = { max: at(LATEST) };
  const run = (state: State, range: { min?: DateTime.DateTime; max?: DateTime.DateTime } | undefined) => {
    const onDateRangeSelect = vi.fn<(rv: RangeValue<Date>, source: DateUpdateSource) => void>();
    const next = withMiddleware(reducer, onDateRangeSelect, identityRounding)(
      state, ClampSelection({ range }));
    return { next, onDateRangeSelect };
  };

  it('reports the clamped selection once, as an external change', () => {
    const { onDateRangeSelect } = run(baseState(), ceiling);

    expect(onDateRangeSelect).toHaveBeenCalledTimes(1);
    const [rv, source] = onDateRangeSelect.mock.calls[0];
    expect(rv.start.toISOString()).toBe('2026-08-22T12:35:31.000Z');
    expect(rv.end.toISOString()).toBe('2026-08-22T13:05:31.000Z');
    expect(source).toBe('external');
  });

  it('reports a resize and a move together in the one call', () => {
    const { onDateRangeSelect } = run(
      baseState({ selectedDuration: Duration.hours(2) }),
      { min: at('2026-08-22T12:05:31Z'), max: at(LATEST) });

    expect(onDateRangeSelect).toHaveBeenCalledTimes(1);
    const [rv] = onDateRangeSelect.mock.calls[0];
    expect(rv.start.toISOString()).toBe('2026-08-22T12:05:31.000Z');
    expect(rv.end.toISOString()).toBe('2026-08-22T13:05:31.000Z');
  });

  it('keeps tracking on and ends the step sequence', () => {
    const { next } = run(baseState(), ceiling);
    expect(next.isTrackingLatest).toBe(true);
    expect(next.stepCursor).toBeNull();
  });

  it('brings the view along when the clamped selection leaves it', () => {
    const { next } = run(baseState({ viewStartDateTime: at('2026-08-22T20:00:00Z') }), ceiling);
    const viewEnd = DateTime.addDuration(next.viewStartDateTime, next.viewDuration);
    expect(DateTime.lessThanOrEqualTo(next.viewStartDateTime, next.selectedStartDateTime)).toBe(true);
    expect(DateTime.greaterThanOrEqualTo(viewEnd,
      DateTime.addDuration(next.selectedStartDateTime, next.selectedDuration))).toBe(true);
  });

  it('moves the animation bounds inside the range too', () => {
    const { next } = run(baseState(), ceiling);
    expect(iso(next.animationStartDateTime)).toBe('2026-08-22T11:05:31.000Z');
    expect(Duration.toMillis(next.animationDuration)).toBe(Duration.toMillis(Duration.hours(2)));
  });

  it('clamps whatever the selection is when it runs, not when it was dispatched', () => {
    // A dateRange change landing in the same commit as the range change is
    // reduced first; the clamp must act on it rather than on the old selection.
    const moved = reducer(baseState(), ExtSetSelectedStartDateTime({
      selectedStartDateTime: at('2026-08-22T12:00:00Z'),
      updateSource: UpdateSource.ExternalProp,
    }));
    const { next, onDateRangeSelect } = run(moved, ceiling);
    expect(iso(next.selectedStartDateTime)).toBe('2026-08-22T12:00:00.000Z');
    expect(Duration.toMillis(next.selectedDuration)).toBe(Duration.toMillis(Duration.minutes(30)));
    expect(onDateRangeSelect).not.toHaveBeenCalled();
  });

  it('returns the same state and stays silent when everything already fits', () => {
    const fitting = baseState({
      selectedStartDateTime: at('2026-08-22T12:00:00Z'),
      animationStartDateTime: at('2026-08-22T10:00:00Z'),
    });
    const { next, onDateRangeSelect } = run(fitting, ceiling);
    expect(next).toBe(fitting);
    expect(onDateRangeSelect).not.toHaveBeenCalled();
  });

  it('does nothing without a range', () => {
    const state = baseState();
    expect(run(state, undefined).next).toBe(state);
  });
});
