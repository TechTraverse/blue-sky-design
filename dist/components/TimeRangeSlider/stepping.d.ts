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
export declare const resolveStepMs: (stepSizeMs: number | undefined, selectedDuration: Duration.Duration) => number;
/** Move `from` one step in `direction`. */
export declare const stepFrom: (from: DateTime.DateTime, stepMs: number, direction: StepDirection) => DateTime.DateTime;
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
export declare const makeStepLattice: (anchor: Date | undefined, phaseMs: number | undefined, stepMs: number) => StepLattice | undefined;
/**
 * The lattice position adjacent to `from` in `direction` — strictly past it, so
 * an on-lattice cursor moves exactly one step and an off-lattice cursor lands on
 * the neighbouring position without also travelling the snap distance.
 */
export declare const adjacentLatticePosition: (from: DateTime.DateTime, lattice: StepLattice, direction: StepDirection) => DateTime.DateTime;
/**
 * Where a step lands. On a lattice it walks the lattice; without one it falls
 * back to free-running `from ± stepMs` arithmetic.
 */
export declare const nextStepPosition: (from: DateTime.DateTime, stepMs: number, direction: StepDirection, lattice: StepLattice | undefined) => DateTime.DateTime;
/**
 * The selection one step away from `from`, carrying the current width along.
 * Stepping translates the window; it never resizes it.
 */
export declare const stepSelection: (from: DateTime.DateTime, stepMs: number, direction: StepDirection, width: Duration.Duration, lattice?: StepLattice, positions?: readonly number[]) => {
    start: DateTime.DateTime;
    end: DateTime.DateTime;
    resolvedBy: StepResolution;
};
/** How a step's destination was determined. */
export type StepResolution = 'positions' | 'lattice';
/**
 * Normalise the frame instants pushed down by the consumer: valid, unique and
 * ascending epoch millis. Undefined when there is nothing usable to step along.
 */
export declare const normalizeStepPositions: (positions: readonly Date[] | undefined) => number[] | undefined;
/**
 * The observed frame adjacent to `from`, or undefined when `from` sits outside
 * the pushed span — beyond it there is no list, so the lattice takes over.
 */
export declare const adjacentPosition: (from: DateTime.DateTime, positions: readonly number[], direction: StepDirection) => DateTime.DateTime | undefined;
/**
 * Where the next step starts from. An active sequence walks from its own
 * recorded cursor, never from the shared selection cell — that cell has five
 * writers, so re-reading it turns N clicks into N re-bases instead of N steps.
 */
export declare const sequenceCursor: (stepCursor: DateTime.DateTime | null, selectedStartDateTime: DateTime.DateTime) => DateTime.DateTime;
/** A track-latest re-base is only allowed to move the selection between step sequences. */
export declare const acceptsTrackLatestRebase: (stepCursor: DateTime.DateTime | null) => boolean;
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
export declare const isStepBlocked: (start: DateTime.DateTime, end: DateTime.DateTime, direction: StepDirection, range: SelectableRange | undefined) => boolean;
