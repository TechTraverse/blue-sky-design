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
  lattice?: StepLattice
): { start: DateTime.DateTime; end: DateTime.DateTime } => {
  const start = nextStepPosition(from, stepMs, direction, lattice);
  return { start, end: DateTime.addDuration(start, width) };
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
