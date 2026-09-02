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
 * The selection one step away from `from`, carrying the current width along.
 * Stepping translates the window; it never resizes it.
 */
export const stepSelection = (
  from: DateTime.DateTime,
  stepMs: number,
  direction: StepDirection,
  width: Duration.Duration
): { start: DateTime.DateTime; end: DateTime.DateTime } => {
  const start = stepFrom(from, stepMs, direction);
  return { start, end: DateTime.addDuration(start, width) };
};
