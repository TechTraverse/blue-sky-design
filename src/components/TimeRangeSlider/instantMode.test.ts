import { describe, expect, it, vi } from 'vitest';
import { DateTime, Duration, Effect, Fiber } from 'effect';
import type { RangeValue } from '@react-types/shared';
import {
  clampInstant,
  DEFAULT_INSTANT_STEP_MS,
  DEFAULT_STEP_OPTIONS_MS,
  instantAfterStepChange,
  latestInstant,
  resolveInstantStepMs,
  resolveStepOptions,
  snapInstant,
  stepInstant,
} from './stepping';
import {
  computeNextAnimationFrame,
  lookaheadFrames,
  makeAnimationLoopEffect,
  upcomingAnimationFrames,
  type AnimationFrameState,
} from './animationFrame';
import {
  ClampSelection,
  ExtSetSelectionMode,
  SetSelectedDuration,
  SetSelectedStartDateTime,
  UpdateSource,
  reducer,
  withMiddleware,
  type Action,
  type DateUpdateSource,
  type State,
} from './timeSliderReducer';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, TimeZone } from './timeSliderTypes';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime | undefined) => dt && DateTime.toDate(dt).toISOString();
const identityRounding = (dt: DateTime.DateTime) => dt;

const MIN = 60 * 1000;
const FIVE = 5 * MIN;

// availableDateRange as the app passes it: a ceiling already floored to the step.
const range = { min: at('2026-08-21T13:07:00Z'), max: at('2026-08-22T13:05:00Z') };

describe('resolveInstantStepMs', () => {
  it('takes a usable step as whole milliseconds and falls back to 5 minutes', () => {
    expect(resolveInstantStepMs(10 * MIN)).toBe(10 * MIN);
    expect(resolveInstantStepMs(60_000.4)).toBe(60_000);
    expect(resolveInstantStepMs(undefined)).toBe(DEFAULT_INSTANT_STEP_MS);
    expect(resolveInstantStepMs(0)).toBe(DEFAULT_INSTANT_STEP_MS);
    expect(resolveInstantStepMs(-FIVE)).toBe(DEFAULT_INSTANT_STEP_MS);
    expect(resolveInstantStepMs(Number.NaN)).toBe(DEFAULT_INSTANT_STEP_MS);
  });
});

describe('resolveStepOptions', () => {
  it('defaults to 1, 5, 10 and 30 minutes', () => {
    expect(resolveStepOptions(undefined, FIVE)).toEqual([...DEFAULT_STEP_OPTIONS_MS]);
    expect(DEFAULT_STEP_OPTIONS_MS).toEqual([MIN, FIVE, 10 * MIN, 30 * MIN]);
  });

  it('sorts, dedupes and drops unusable choices', () => {
    expect(resolveStepOptions([30 * MIN, MIN, 0, MIN, Number.NaN], MIN)).toEqual([MIN, 30 * MIN]);
  });

  it('adds the current step so one choice is always selected', () => {
    expect(resolveStepOptions([MIN, 10 * MIN], 15 * MIN)).toEqual([MIN, 10 * MIN, 15 * MIN]);
  });
});

describe('snapInstant', () => {
  it('floors or rounds onto the epoch grid', () => {
    expect(iso(snapInstant(at('2026-08-22T12:07:40Z'), FIVE, 'floor'))).toBe('2026-08-22T12:05:00.000Z');
    expect(iso(snapInstant(at('2026-08-22T12:07:40Z'), FIVE, 'nearest'))).toBe('2026-08-22T12:10:00.000Z');
    expect(iso(snapInstant(at('2026-08-22T12:07:20Z'), FIVE, 'nearest'))).toBe('2026-08-22T12:05:00.000Z');
    expect(iso(snapInstant(at('2026-08-22T12:44:59Z'), 30 * MIN, 'floor'))).toBe('2026-08-22T12:30:00.000Z');
  });

  it('leaves an on-grid instant where it is', () => {
    expect(iso(snapInstant(at('2026-08-22T12:05:00Z'), FIVE, 'floor'))).toBe('2026-08-22T12:05:00.000Z');
    expect(iso(snapInstant(at('2026-08-22T12:05:00Z'), FIVE, 'nearest'))).toBe('2026-08-22T12:05:00.000Z');
  });

  it('keeps the snapped instant inside the range on the grid', () => {
    // Nearest of 13:04 is 13:05, the ceiling itself.
    expect(iso(snapInstant(at('2026-08-22T13:04:00Z'), FIVE, 'nearest', range))).toBe('2026-08-22T13:05:00.000Z');
    // Past the ceiling comes back to it.
    expect(iso(snapInstant(at('2026-08-22T13:20:00Z'), FIVE, 'nearest', range))).toBe('2026-08-22T13:05:00.000Z');
    // The floor (13:07) is off the grid: the first grid point after it is 13:10.
    expect(iso(snapInstant(at('2026-08-21T13:06:00Z'), FIVE, 'nearest', range))).toBe('2026-08-21T13:10:00.000Z');
    expect(iso(snapInstant(at('2026-08-21T13:08:00Z'), FIVE, 'floor', range))).toBe('2026-08-21T13:10:00.000Z');
  });

  it('floors an off-grid ceiling defensively', () => {
    const offGrid = { max: at('2026-08-22T13:07:31Z') };
    expect(iso(snapInstant(at('2026-08-22T13:09:00Z'), FIVE, 'nearest', offGrid))).toBe('2026-08-22T13:05:00.000Z');
  });

  it('settles on the ceiling when no grid point fits in the range', () => {
    const narrow = { min: at('2026-08-22T13:06:00Z'), max: at('2026-08-22T13:09:00Z') };
    expect(iso(snapInstant(at('2026-08-22T13:07:00Z'), FIVE, 'floor', narrow))).toBe('2026-08-22T13:05:00.000Z');
  });
});

describe('a step size change', () => {
  // The component floors the instant onto the new grid, inside the bounds.
  it('floors the instant onto the coarser grid', () => {
    expect(iso(snapInstant(at('2026-08-22T12:25:00Z'), 10 * MIN, 'floor', range))).toBe('2026-08-22T12:20:00.000Z');
    expect(iso(snapInstant(at('2026-08-22T12:25:00Z'), 30 * MIN, 'floor', range))).toBe('2026-08-22T12:00:00.000Z');
  });

  it('leaves the instant alone on a finer grid', () => {
    expect(iso(snapInstant(at('2026-08-22T12:30:00Z'), MIN, 'floor', range))).toBe('2026-08-22T12:30:00.000Z');
  });

  it('lifts a floored instant that drops below the floor back onto the grid inside it', () => {
    expect(iso(snapInstant(at('2026-08-21T13:10:00Z'), 30 * MIN, 'floor', range))).toBe('2026-08-21T13:30:00.000Z');
  });

  it('goes to the newest grid point and keeps tracking while tracking latest', () => {
    const next = instantAfterStepChange(
      { instant: at('2026-08-22T12:30:00Z'), isTrackingLatest: true, lastKnownLatest: at('2026-08-22T12:58:00Z') },
      MIN, range);
    expect(iso(next.instant)).toBe('2026-08-22T12:58:00.000Z');
    expect(next.tracking).toBe(true);
  });

  it('keeps tracking before the first poll returns, using the ceiling as the latest', () => {
    const next = instantAfterStepChange(
      { instant: at('2026-08-22T12:30:00Z'), isTrackingLatest: true, lastKnownLatest: null }, MIN, range);
    expect(iso(next.instant)).toBe('2026-08-22T13:05:00.000Z');
    expect(next.tracking).toBe(true);
  });

  it('floors the instant and leaves tracking off when not tracking', () => {
    const next = instantAfterStepChange(
      { instant: at('2026-08-22T12:25:00Z'), isTrackingLatest: false, lastKnownLatest: at('2026-08-22T12:58:00Z') },
      30 * MIN, range);
    expect(iso(next.instant)).toBe('2026-08-22T12:00:00.000Z');
    expect(next.tracking).toBe(false);
  });
});

describe('stepInstant', () => {
  it('moves exactly one step on the grid', () => {
    const from = at('2026-08-22T12:05:00Z');
    expect(iso(stepInstant(from, FIVE, 1, range).to)).toBe('2026-08-22T12:10:00.000Z');
    expect(iso(stepInstant(from, FIVE, -1, range).to)).toBe('2026-08-22T12:00:00.000Z');
    expect(iso(stepInstant(from, 30 * MIN, 1, range).to)).toBe('2026-08-22T12:30:00.000Z');
  });

  it('takes an off-grid instant to the adjacent grid point', () => {
    const from = at('2026-08-22T12:07:31Z');
    expect(iso(stepInstant(from, FIVE, 1).to)).toBe('2026-08-22T12:10:00.000Z');
    expect(iso(stepInstant(from, FIVE, -1).to)).toBe('2026-08-22T12:05:00.000Z');
  });

  it('is blocked at the ceiling', () => {
    const atCeiling = stepInstant(at('2026-08-22T13:05:00Z'), FIVE, 1, range);
    expect(atCeiling.blocked).toBe(true);
    expect(stepInstant(at('2026-08-22T13:05:00Z'), FIVE, -1, range).blocked).toBe(false);
    expect(stepInstant(at('2026-08-22T13:00:00Z'), FIVE, 1, range).blocked).toBe(false);
  });

  it('is blocked at the floor, even an off-grid one', () => {
    // The floor is 13:07, so 13:10 is the first grid point inside it.
    expect(stepInstant(at('2026-08-21T13:10:00Z'), FIVE, -1, range).blocked).toBe(true);
    expect(stepInstant(at('2026-08-21T13:10:00Z'), FIVE, 1, range).blocked).toBe(false);
  });

  it('only checks the bound in the direction of travel', () => {
    // Above the ceiling, stepping back toward the range is allowed.
    expect(stepInstant(at('2026-08-22T14:00:00Z'), FIVE, -1, range).blocked).toBe(false);
  });
});

describe('clampInstant', () => {
  it('leaves an instant inside the range alone, on the grid or not', () => {
    expect(clampInstant(at('2026-08-22T12:00:00Z'), FIVE, range)).toBeUndefined();
    expect(clampInstant(at('2026-08-22T12:03:31Z'), FIVE, range)).toBeUndefined();
    expect(clampInstant(at('2026-08-22T12:00:00Z'), FIVE, undefined)).toBeUndefined();
  });

  it('drops an instant above a ceiling that moved back onto the ceiling', () => {
    expect(iso(clampInstant(at('2026-08-22T13:30:00Z'), FIVE, range))).toBe('2026-08-22T13:05:00.000Z');
    expect(iso(clampInstant(at('2026-08-22T13:30:00Z'), FIVE, { max: at('2026-08-22T13:07:31Z') })))
      .toBe('2026-08-22T13:05:00.000Z');
  });

  it('lifts an instant the floor moved past onto the first grid point inside it', () => {
    expect(iso(clampInstant(at('2026-08-21T09:00:00Z'), FIVE, range))).toBe('2026-08-21T13:10:00.000Z');
  });
});

describe('latestInstant', () => {
  it('floors the latest data onto the grid', () => {
    expect(iso(latestInstant(at('2026-08-22T12:58:31Z'), FIVE, range))).toBe('2026-08-22T12:55:00.000Z');
    expect(iso(latestInstant(at('2026-08-22T12:58:31Z'), MIN, range))).toBe('2026-08-22T12:58:00.000Z');
  });

  it('never passes the ceiling', () => {
    expect(iso(latestInstant(at('2026-08-22T13:12:31Z'), FIVE, range))).toBe('2026-08-22T13:05:00.000Z');
    expect(iso(latestInstant(at('2026-08-22T13:12:31Z'), 30 * MIN, range))).toBe('2026-08-22T13:00:00.000Z');
  });
});

const mkState = (startMs: number, animStartMs: number, animDurMs: number): AnimationFrameState => ({
  selectedStartDateTime: DateTime.unsafeMake(startMs),
  selectedDuration: Duration.zero,
  animationStartDateTime: DateTime.unsafeMake(animStartMs),
  animationDuration: Duration.millis(animDurMs),
});

const starts = (frames: { start: DateTime.DateTime }[]) => frames.map((f) => DateTime.toEpochMillis(f.start));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('grid-aligned animation frames', () => {
  const HOUR = 60 * MIN;

  it('advances exactly one step per frame with end === start', () => {
    const { nextStart, frame } = computeNextAnimationFrame(mkState(10 * MIN, 0, HOUR), FIVE, true);
    expect(DateTime.toEpochMillis(nextStart)).toBe(15 * MIN);
    expect(DateTime.toEpochMillis(frame.end)).toBe(15 * MIN);
  });

  it('runs backwards for a negative step', () => {
    const { nextStart } = computeNextAnimationFrame(mkState(10 * MIN, 0, HOUR), -FIVE, true);
    expect(DateTime.toEpochMillis(nextStart)).toBe(5 * MIN);
  });

  it('puts an off-grid instant back on the grid with its first frame', () => {
    expect(DateTime.toEpochMillis(computeNextAnimationFrame(mkState(7 * MIN, 0, HOUR), FIVE, true).nextStart))
      .toBe(10 * MIN);
    expect(DateTime.toEpochMillis(computeNextAnimationFrame(mkState(7 * MIN, 0, HOUR), -FIVE, true).nextStart))
      .toBe(5 * MIN);
  });

  it('wraps forwards from the last grid point to the first', () => {
    // The range end itself is a valid frame for an instant: 55, 60, then 0.
    expect(starts(upcomingAnimationFrames(mkState(50 * MIN, 0, HOUR), FIVE, 3, true)))
      .toEqual([55 * MIN, 60 * MIN, 0]);
  });

  it('wraps backwards from the first grid point to the last', () => {
    expect(starts(upcomingAnimationFrames(mkState(5 * MIN, 0, HOUR), -FIVE, 3, true)))
      .toEqual([0, 60 * MIN, 55 * MIN]);
  });

  it('wraps inside an animation range whose ends are off the grid', () => {
    // Range 2:00..62:00 holds grid points 5..60.
    const state = mkState(55 * MIN, 2 * MIN, HOUR);
    expect(starts(upcomingAnimationFrames(state, FIVE, 3, true))).toEqual([60 * MIN, 5 * MIN, 10 * MIN]);
    expect(starts(upcomingAnimationFrames(mkState(5 * MIN, 2 * MIN, HOUR), -FIVE, 2, true)))
      .toEqual([60 * MIN, 55 * MIN]);
  });

  it('holds in an animation range with no grid point, instead of leaving it', () => {
    // 30-minute steps in 5:00..15:00: the nearest grid points, 0 and 30, are both outside.
    const state = mkState(10 * MIN, 5 * MIN, 10 * MIN);
    expect(DateTime.toEpochMillis(computeNextAnimationFrame(state, 30 * MIN, true).nextStart)).toBe(10 * MIN);
    expect(DateTime.toEpochMillis(computeNextAnimationFrame(state, -30 * MIN, true).nextStart)).toBe(10 * MIN);
  });

  it('leaves range-mode frame math alone when not grid aligned', () => {
    expect(DateTime.toEpochMillis(computeNextAnimationFrame(mkState(7 * MIN, 0, HOUR), FIVE).nextStart))
      .toBe(12 * MIN);
  });

  it('gives lookahead frames with end === start, the selected instant first', () => {
    const frames = lookaheadFrames(mkState(50 * MIN, 0, HOUR), FIVE, 3, true);
    expect(starts(frames)).toEqual([50 * MIN, 55 * MIN, 60 * MIN, 0]);
    for (const f of frames) {
      expect(DateTime.toEpochMillis(f.end)).toBe(DateTime.toEpochMillis(f.start));
    }
  });

  it('steps the back-pressure loop along the grid', async () => {
    const dispatches: number[] = [];
    const resolvers: Array<() => void> = [];
    let start = 52 * MIN;
    const loop = makeAnimationLoopEffect({
      readState: () => mkState(start, 0, HOUR),
      advanceMs: FIVE,
      frameMs: 0,
      gridAligned: true,
      dispatchFrame: (nextStart) => {
        start = DateTime.toEpochMillis(nextStart);
        dispatches.push(start);
      },
      onFrameSettled: (frame) => {
        expect(DateTime.toEpochMillis(frame.end)).toBe(DateTime.toEpochMillis(frame.start));
        return new Promise<void>((res) => resolvers.push(res));
      },
      maxWaitMs: 1_000_000,
    });

    const fiber = Effect.runFork(loop);
    await tick();
    resolvers[0]();
    await tick();
    resolvers[1]();
    await tick();
    Effect.runFork(Fiber.interrupt(fiber));
    await tick();

    expect(dispatches.slice(0, 3)).toEqual([55 * MIN, 60 * MIN, 0]);
  });
});

const instantState = (overrides: Partial<State> = {}): State => ({
  selectionMode: 'instant',
  timeZone: TimeZone.Local,
  increment: TimeDuration['5m'],
  viewStartDateTime: at('2026-08-22T11:00:00Z'),
  viewDuration: Duration.hours(4),
  resetStartDateTime: at('2026-08-22T13:00:00Z'),
  resetDuration: Duration.zero,
  selectedStartDateTime: at('2026-08-22T13:00:00Z'),
  selectedDuration: Duration.zero,
  stepCursor: null,
  animationOrStepMode: AnimationOrStepMode.Step,
  resetAnimationSpeed: AnimationSpeed['5 min/sec'],
  resetAnimationDuration: Duration.hours(2),
  animationStartDateTime: at('2026-08-22T11:00:00Z'),
  animationDuration: Duration.hours(2),
  animationRequestFrequency: AnimationRequestFrequency['1 fps'],
  animationPlayMode: PlayMode.Pause,
  animationSpeed: AnimationSpeed['5 min/sec'],
  isTrackingLatest: false,
  lastKnownLatestDate: null,
  ...overrides,
});

const run = (state: State, action: Action) => {
  const onDateRangeSelect = vi.fn<(rv: RangeValue<Date>, source: DateUpdateSource) => void>();
  const next = withMiddleware(reducer, onDateRangeSelect, identityRounding)(state, action);
  return { next, onDateRangeSelect };
};

describe('reducer in instant mode', () => {
  it('reports every selection with end === start', () => {
    const { onDateRangeSelect } = run(instantState(), SetSelectedStartDateTime({
      selectedStartDateTime: at('2026-08-22T13:05:00Z'), updateSource: UpdateSource.Step }));
    const [rv, source] = onDateRangeSelect.mock.calls[0];
    expect(rv.start.toISOString()).toBe('2026-08-22T13:05:00.000Z');
    expect(rv.end.getTime()).toBe(rv.start.getTime());
    expect(source).toBe('step');
  });

  it('ignores width changes', () => {
    const { next, onDateRangeSelect } = run(instantState(), SetSelectedDuration({
      selectedDuration: Duration.minutes(5), updateSource: UpdateSource.UserInteraction }));
    expect(Duration.toMillis(next.selectedDuration)).toBe(0);
    expect(onDateRangeSelect).not.toHaveBeenCalled();
  });

  it('clamps an instant the ceiling dropped below onto the grid, as external', () => {
    const { next, onDateRangeSelect } = run(
      instantState({ selectedStartDateTime: at('2026-08-22T13:30:00Z') }),
      ClampSelection({ range: { max: at('2026-08-22T13:07:31Z') }, gridStepMs: FIVE }));
    expect(iso(next.selectedStartDateTime)).toBe('2026-08-22T13:05:00.000Z');
    expect(Duration.toMillis(next.selectedDuration)).toBe(0);
    const [rv, source] = onDateRangeSelect.mock.calls[0];
    expect(rv.end.getTime()).toBe(rv.start.getTime());
    expect(source).toBe('external');
  });

  it('does not clamp an off-grid instant that is inside the range', () => {
    const { next, onDateRangeSelect } = run(
      instantState({ selectedStartDateTime: at('2026-08-22T12:03:31Z') }),
      ClampSelection({ range, gridStepMs: FIVE }));
    expect(iso(next.selectedStartDateTime)).toBe('2026-08-22T12:03:31.000Z');
    expect(onDateRangeSelect).not.toHaveBeenCalled();
  });

  it('zeroes the width entering instant mode and restores one leaving it', () => {
    const ranged = instantState({
      selectionMode: 'range',
      selectedDuration: Duration.minutes(10),
      resetDuration: Duration.minutes(10),
    });
    const entered = reducer(ranged, ExtSetSelectionMode({ selectionMode: 'instant' }));
    expect(entered.selectionMode).toBe('instant');
    expect(Duration.toMillis(entered.selectedDuration)).toBe(0);
    expect(Duration.toMillis(entered.resetDuration)).toBe(0);

    const left = reducer(entered, ExtSetSelectionMode({ selectionMode: 'range' }));
    expect(left.selectionMode).toBe('range');
    expect(Duration.toMillis(left.selectedDuration)).toBe(5 * MIN);
  });
});
