import { DateTime, Duration } from 'effect';

/** Which way a step button moves the cursor. */
export type StepDirection = -1 | 1;

/**
 * Milliseconds one step button press moves the selection.
 *
 * Step distance is independent of the selection width: a 5-minute window may
 * step 30 seconds. When `stepSizeMs` is absent (or not a usable positive
 * number) the legacy behaviour applies and the window width is the step.
 */
export const resolveStepMs = (
  stepSizeMs: number | undefined,
  selectedDuration: Duration.Duration
): number =>
  typeof stepSizeMs === 'number' && Number.isFinite(stepSizeMs) && stepSizeMs > 0
    ? stepSizeMs
    : Duration.toMillis(selectedDuration);

/** Move `from` one step in `direction`. */
export const stepFrom = (
  from: DateTime.DateTime,
  stepMs: number,
  direction: StepDirection
): DateTime.DateTime =>
  // Duration is unsigned, so back-stepping subtracts rather than adding a negative.
  direction === 1
    ? DateTime.addDuration(from, Duration.millis(stepMs))
    : DateTime.subtractDuration(from, Duration.millis(stepMs));

/**
 * The lattice a step sequence walks: positions are `originMs + k * stepMs`.
 * `originMs` is the caller-supplied anchor shifted by the observed phase — no
 * collection produces frames on a round minute, so a clock grid misses them all.
 */
export interface StepLattice {
  originMs: number;
  stepMs: number;
}

/**
 * Build a lattice from the anchor/phase props. Absent anchor, or a step that is
 * not a positive whole millisecond, means free-running steps instead. Positions
 * are whole milliseconds because `DateTime` truncates: a fractional lattice
 * would round back onto the cursor and the button would do nothing.
 */
export const makeStepLattice = (
  anchor: Date | undefined,
  phaseMs: number | undefined,
  stepMs: number
): StepLattice | undefined => {
  if (!(anchor instanceof Date) || Number.isNaN(anchor.getTime())) return undefined;
  if (!Number.isFinite(stepMs)) return undefined;
  const step = Math.round(stepMs);
  if (step <= 0) return undefined;
  const phase = Number.isFinite(phaseMs) ? (phaseMs as number) : 0;
  return { originMs: Math.round(anchor.getTime() + phase), stepMs: step };
};

/**
 * The lattice position adjacent to `from` in `direction` — strictly past it, so
 * an on-lattice cursor moves exactly one step and an off-lattice cursor lands on
 * the neighbouring position without also travelling the snap distance.
 */
export const adjacentLatticePosition = (
  from: DateTime.DateTime,
  lattice: StepLattice,
  direction: StepDirection
): DateTime.DateTime => {
  const offset = (DateTime.toEpochMillis(from) - lattice.originMs) / lattice.stepMs;
  const k = direction === 1 ? Math.floor(offset) + 1 : Math.ceil(offset) - 1;
  return DateTime.unsafeMake(lattice.originMs + k * lattice.stepMs);
};

/**
 * Where a step lands. On a lattice it walks the lattice; without one it falls
 * back to free-running `from ± stepMs` arithmetic.
 */
export const nextStepPosition = (
  from: DateTime.DateTime,
  stepMs: number,
  direction: StepDirection,
  lattice: StepLattice | undefined
): DateTime.DateTime =>
  lattice ? adjacentLatticePosition(from, lattice, direction) : stepFrom(from, stepMs, direction);

/**
 * The selection one step away from `from`, carrying the current width along.
 * Stepping translates the window; it never resizes it.
 */
export const stepSelection = (
  from: DateTime.DateTime,
  stepMs: number,
  direction: StepDirection,
  width: Duration.Duration,
  lattice?: StepLattice,
  positions?: readonly number[]
): { start: DateTime.DateTime; end: DateTime.DateTime; resolvedBy: StepResolution } => {
  const observed = positions && adjacentPosition(from, positions, direction);
  const start = observed ?? nextStepPosition(from, stepMs, direction, lattice);
  return {
    start,
    end: DateTime.addDuration(start, width),
    resolvedBy: observed ? 'positions' : 'lattice',
  };
};

/** How a step's destination was determined. */
export type StepResolution = 'positions' | 'lattice';

/**
 * Normalise the frame instants pushed down by the consumer: valid, unique and
 * ascending epoch millis. Undefined when there is nothing usable to step along.
 */
export const normalizeStepPositions = (
  positions: readonly Date[] | undefined
): number[] | undefined => {
  if (!positions?.length) return undefined;
  const ms = positions
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
    .map((d) => d.getTime())
    .sort((a, b) => a - b)
    .filter((v, i, all) => i === 0 || v !== all[i - 1]);
  return ms.length ? ms : undefined;
};

/**
 * The observed frame adjacent to `from`, or undefined when `from` sits outside
 * the pushed span — beyond it there is no list, so the lattice takes over.
 */
export const adjacentPosition = (
  from: DateTime.DateTime,
  positions: readonly number[],
  direction: StepDirection
): DateTime.DateTime | undefined => {
  const fromMs = DateTime.toEpochMillis(from);
  if (fromMs < positions[0] || fromMs > positions[positions.length - 1]) return undefined;

  // Binary search for the first entry strictly greater than the cursor.
  let lo = 0;
  let hi = positions.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (positions[mid] > fromMs) hi = mid; else lo = mid + 1;
  }
  const index = direction === 1 ? lo : lo - (positions[lo - 1] === fromMs ? 2 : 1);
  return index >= 0 && index < positions.length ? DateTime.unsafeMake(positions[index]) : undefined;
};

/**
 * Where the next step starts from. An active sequence walks from its own
 * recorded cursor, never from the shared selection cell — that cell has five
 * writers, so re-reading it turns N clicks into N re-bases instead of N steps.
 */
export const sequenceCursor = (
  stepCursor: DateTime.DateTime | null,
  selectedStartDateTime: DateTime.DateTime
): DateTime.DateTime => stepCursor ?? selectedStartDateTime;

/** A track-latest re-base is only allowed to move the selection between step sequences. */
export const acceptsTrackLatestRebase = (stepCursor: DateTime.DateTime | null): boolean =>
  stepCursor === null;

/**
 * The bounds a selection may not cross. Either end may be open: history has no
 * known archive start, so a consumer capping the ceiling should not have to
 * invent a floor. Undefined when both ends are open.
 */
export interface SelectableRange {
  min?: DateTime.DateTime;
  max?: DateTime.DateTime;
}

/**
 * Whether a stepped selection leaves the selectable range. Only the bound in the
 * direction of travel applies, so a selection already outside the range can still
 * be stepped back into it.
 */
export const isStepBlocked = (
  start: DateTime.DateTime,
  end: DateTime.DateTime,
  direction: StepDirection,
  range: SelectableRange | undefined
): boolean => {
  if (!range) return false;
  return direction === 1
    ? range.max !== undefined && DateTime.greaterThan(end, range.max)
    : range.min !== undefined && DateTime.lessThan(start, range.min);
};

/**
 * The selection moved back inside `range`, or undefined when it already fits
 * (or no bound applies). An open end imposes nothing on its side. The selection
 * is translated rather than resized; only when the range is narrower than the
 * selection is the width cut down to fill the range exactly. An inverted range
 * is ignored rather than guessed at.
 *
 * Every writer checks the bounds when it moves the selection, so this is for the
 * opposite case: the bounds moving under a selection that stayed put.
 */
export const clampSelection = (
  start: DateTime.DateTime,
  width: Duration.Duration,
  range: SelectableRange | undefined
): { start: DateTime.DateTime; width: Duration.Duration } | undefined => {
  if (!range) return undefined;
  const minMs = range.min && DateTime.toEpochMillis(range.min);
  const maxMs = range.max && DateTime.toEpochMillis(range.max);
  if (minMs !== undefined && maxMs !== undefined && maxMs < minMs) return undefined;

  const startMs = DateTime.toEpochMillis(start);
  const widthMs = Duration.toMillis(width);
  const belowFloor = minMs !== undefined && startMs < minMs;
  const aboveCeiling = maxMs !== undefined && startMs + widthMs > maxMs;
  if (!belowFloor && !aboveCeiling) return undefined;

  if (minMs !== undefined && maxMs !== undefined && widthMs > maxMs - minMs) {
    return { start: DateTime.unsafeMake(minMs), width: Duration.millis(maxMs - minMs) };
  }
  const clampedMs = belowFloor ? minMs as number : (maxMs as number) - widthMs;
  return { start: DateTime.unsafeMake(clampedMs), width };
};

/*
 * Instant mode: the selection is a single instant on a clock grid of
 * `k * stepMs` epoch milliseconds, so a 5-minute step lands on 13:00, 13:05, …
 * whatever the display zone. Everything the user does is snapped onto the grid;
 * an instant arriving on the `dateRange` prop is taken as given.
 */

/** Step size instant mode uses when `stepMs` is absent or unusable. */
export const DEFAULT_INSTANT_STEP_MS = 5 * 60 * 1000;

/** Choices the step selector offers when `stepOptionsMs` is absent. */
export const DEFAULT_STEP_OPTIONS_MS: readonly number[] = [1, 5, 10, 30].map((m) => m * 60 * 1000);

const isUsableStep = (stepMs: unknown): stepMs is number =>
  typeof stepMs === 'number' && Number.isFinite(stepMs) && Math.round(stepMs) > 0;

/** The grid step in whole milliseconds, falling back to the default. */
export const resolveInstantStepMs = (stepMs: number | undefined): number =>
  isUsableStep(stepMs) ? Math.round(stepMs) : DEFAULT_INSTANT_STEP_MS;

/**
 * The step selector's choices: valid, unique and ascending, with the current
 * step added when the list lacks it, so one choice is always selected.
 */
export const resolveStepOptions = (
  options: readonly number[] | undefined,
  currentStepMs: number
): number[] => {
  const valid = (options ?? []).filter(isUsableStep).map(Math.round);
  const base = valid.length ? valid : [...DEFAULT_STEP_OPTIONS_MS];
  return [...new Set([...base, currentStepMs])].sort((a, b) => a - b);
};

/** How an arbitrary instant is moved onto the grid. */
export type GridSnap = 'floor' | 'nearest';

export const floorToGrid = (ms: number, stepMs: number): number =>
  Math.floor(ms / stepMs) * stepMs;

export const ceilToGrid = (ms: number, stepMs: number): number =>
  Math.ceil(ms / stepMs) * stepMs;

export const nearestGridPoint = (ms: number, stepMs: number): number =>
  Math.round(ms / stepMs) * stepMs;

/**
 * Move an on-grid instant to the nearest grid point inside `range`: the first
 * one at or after the floor, the last one at or before the ceiling. When no
 * grid point fits between the two, the ceiling wins, since nothing newer than
 * it exists.
 */
const clampOnGrid = (ms: number, stepMs: number, range: SelectableRange | undefined): number => {
  const lo = range?.min && ceilToGrid(DateTime.toEpochMillis(range.min), stepMs);
  const hi = range?.max && floorToGrid(DateTime.toEpochMillis(range.max), stepMs);
  if (hi !== undefined && ms > hi) return hi;
  if (lo !== undefined && ms < lo) return hi !== undefined && hi < lo ? hi : lo;
  return ms;
};

/** Snap an instant onto the grid, then pull it inside `range` on the grid. */
export const snapInstant = (
  instant: DateTime.DateTime,
  stepMs: number,
  snap: GridSnap,
  range?: SelectableRange
): DateTime.DateTime => {
  const ms = DateTime.toEpochMillis(instant);
  const snapped = snap === 'floor' ? floorToGrid(ms, stepMs) : nearestGridPoint(ms, stepMs);
  return DateTime.unsafeMake(clampOnGrid(snapped, stepMs, range));
};

/**
 * Where track-latest puts the instant: the newest grid point at or before both
 * the latest data and the ceiling.
 */
export const latestInstant = (
  latest: DateTime.DateTime,
  stepMs: number,
  range?: SelectableRange
): DateTime.DateTime => snapInstant(latest, stepMs, 'floor', range);

/**
 * The instant one step from `from`: the adjacent grid point, so an on-grid
 * instant moves exactly `stepMs` and an off-grid one lands on its neighbour.
 * Blocked when that point is past the bound in the direction of travel.
 */
export const stepInstant = (
  from: DateTime.DateTime,
  stepMs: number,
  direction: StepDirection,
  range?: SelectableRange
): { to: DateTime.DateTime; blocked: boolean } => {
  const to = adjacentLatticePosition(from, { originMs: 0, stepMs }, direction);
  return { to, blocked: isStepBlocked(to, to, direction, range) };
};

/**
 * The instant moved back inside `range` onto the grid, or undefined when it
 * already fits. An instant inside the range is left alone even off the grid:
 * the consumer owns what it passes in. The instant-mode counterpart of
 * `clampSelection`.
 */
export const clampInstant = (
  instant: DateTime.DateTime,
  stepMs: number,
  range: SelectableRange | undefined
): DateTime.DateTime | undefined => {
  if (!range) return undefined;
  const ms = DateTime.toEpochMillis(instant);
  const belowFloor = range.min !== undefined && ms < DateTime.toEpochMillis(range.min);
  const aboveCeiling = range.max !== undefined && ms > DateTime.toEpochMillis(range.max);
  if (!belowFloor && !aboveCeiling) return undefined;
  return DateTime.unsafeMake(clampOnGrid(
    belowFloor ? ceilToGrid(ms, stepMs) : floorToGrid(ms, stepMs), stepMs, range));
};
