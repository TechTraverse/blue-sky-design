import { describe, expect, it, vi } from 'vitest';
import { DateTime, Duration } from 'effect';
import type { RangeValue } from '@react-types/shared';
import {
  SetAnimationOrStepMode,
  SetSelectedStartDateTime,
  UpdateSource,
  reducer,
  withMiddleware,
  type DateUpdateSource,
  type State,
} from './timeSliderReducer';
import {
  makeStepLattice,
  normalizeStepPositions,
  resolveStepMs,
  sequenceCursor,
  stepSelection,
  type StepDirection,
} from './stepping';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime) => DateTime.toDate(dt).toISOString();
const identityRounding = (dt: DateTime.DateTime) => dt;

// Frames at :31 past the minute, 5-minute cadence — nothing on a round minute.
const FRAMES = ['12:50:31', '12:55:31', '13:00:31', '13:05:31']
  .map((t) => new Date(`2026-08-22T${t}Z`));
const positions = normalizeStepPositions(FRAMES)!;
const lattice = makeStepLattice(FRAMES[0], 0, 300_000);
const width = Duration.minutes(5);

const baseState = (overrides: Partial<State> = {}): State => ({
  timeZone: TimeZone.Local,
  increment: TimeDuration['5m'],
  viewStartDateTime: at('2026-08-22T11:00:00Z'),
  viewDuration: Duration.hours(4),
  resetStartDateTime: at('2026-08-22T13:01:00Z'),
  resetDuration: width,
  selectedStartDateTime: at('2026-08-22T13:03:20Z'),
  selectedDuration: width,
  stepCursor: null,
  animationOrStepMode: AnimationOrStepMode.Step,
  resetAnimationSpeed: AnimationSpeed['5 min/sec'],
  resetAnimationDuration: Duration.hours(2),
  animationStartDateTime: at('2026-08-22T13:03:20Z'),
  animationDuration: Duration.hours(2),
  animationRequestFrequency: AnimationRequestFrequency['1 fps'],
  animationPlayMode: PlayMode.Pause,
  animationSpeed: AnimationSpeed['5 min/sec'],
  isTrackingLatest: false,
  lastKnownLatestDate: null,
  ...overrides,
});

/** One step press against the current state, as the component computes it. */
const press = (state: State, direction: StepDirection) => {
  const from = sequenceCursor(state.stepCursor, state.selectedStartDateTime);
  const stepMs = resolveStepMs(undefined, state.selectedDuration);
  const { start } = stepSelection(from, stepMs, direction, width, lattice, positions);
  return reducer(state, SetSelectedStartDateTime({
    selectedStartDateTime: start,
    updateSource: UpdateSource.Step,
  }));
};

describe('entering a repeatable mode', () => {
  it('does not rewrite the selection, so the consumer keeps the unsnapped value', () => {
    const scrubbed = baseState();
    const onDateRangeSelect = vi.fn<(rv: RangeValue<Date>, source: DateUpdateSource) => void>();
    const next = withMiddleware(reducer, onDateRangeSelect, identityRounding)(
      scrubbed, SetAnimationOrStepMode({ animationOrStepMode: AnimationOrStepMode.Animation }));

    expect(iso(next.selectedStartDateTime)).toBe('2026-08-22T13:03:20.000Z');
    expect(onDateRangeSelect).not.toHaveBeenCalled();
  });

  it('ends a live sequence, so a track-latest re-base lands again afterwards', () => {
    const rebase = SetSelectedStartDateTime({
      selectedStartDateTime: at('2026-08-22T13:05:31Z'),
      updateSource: UpdateSource.TrackLatestUpdate,
    });

    const stepped = press(baseState({ isTrackingLatest: true }), -1);
    expect(reducer(stepped, rebase)).toBe(stepped);

    const switched = reducer(stepped, SetAnimationOrStepMode({
      animationOrStepMode: AnimationOrStepMode.Animation }));
    expect(iso(reducer(switched, rebase).selectedStartDateTime))
      .toBe('2026-08-22T13:05:31.000Z');
  });
});

describe('the first step after a scrub', () => {
  it('goes to the adjacent frame, not the snap plus a step', () => {
    // Cursor at 13:03:20, frames at :31. Back is 13:00:31, not 12:55:31.
    expect(iso(press(baseState(), -1).selectedStartDateTime))
      .toBe('2026-08-22T13:00:31.000Z');
    expect(iso(press(baseState(), 1).selectedStartDateTime))
      .toBe('2026-08-22T13:05:31.000Z');
  });

  it('then walks one frame per press from there', () => {
    let state = baseState();
    const visited: string[] = [];
    for (let i = 0; i < 3; i++) {
      state = press(state, -1);
      visited.push(iso(state.selectedStartDateTime));
    }
    expect(visited).toEqual([
      '2026-08-22T13:00:31.000Z',
      '2026-08-22T12:55:31.000Z',
      '2026-08-22T12:50:31.000Z',
    ]);
  });

  it('absorbs the snap beyond the index too, on the lattice alone', () => {
    // 11:03:20 is outside the pushed frames; the lattice keeps the :31 phase.
    let state = baseState({ selectedStartDateTime: at('2026-08-22T11:03:20Z') });
    state = press(state, -1);
    expect(iso(state.selectedStartDateTime)).toBe('2026-08-22T11:00:31.000Z');
    state = press(state, -1);
    expect(iso(state.selectedStartDateTime)).toBe('2026-08-22T10:55:31.000Z');
  });

  it('is unchanged by re-entering step mode between presses', () => {
    let state = press(baseState(), -1);
    state = reducer(state, SetAnimationOrStepMode({
      animationOrStepMode: AnimationOrStepMode.Step }));
    state = press(state, -1);
    expect(iso(state.selectedStartDateTime)).toBe('2026-08-22T12:55:31.000Z');
  });
});
