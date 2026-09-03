import { DateTime, Duration, Effect } from 'effect';

/** The frame being advanced to, passed to a back-pressure `onFrameSettled`. */
export interface FrameInfo {
  start: DateTime.DateTime;
  end: DateTime.DateTime;
}

/**
 * Controls how the animation clock advances between frames.
 * - `fixed` (the default when `frameAdvance` is omitted): advance on a fixed
 *   timer at `animationRequestFrequency` — the original behavior.
 * - `backpressure`: after dispatching each frame, wait for the longer of
 *   `animationRequestFrequency` and `onFrameSettled(frame)` before advancing, so
 *   the frequency becomes a ceiling and playback never outruns tile loads.
 *   `maxWaitMs` caps how long a stalled `onFrameSettled` can hold the clock.
 */
export type FrameAdvance =
  | { mode: 'fixed' }
  | {
      mode: 'backpressure';
      onFrameSettled: (frame: FrameInfo) => Promise<void>;
      maxWaitMs?: number;
    };

/**
 * Default ceiling on how long a back-pressure `onFrameSettled` can hold the
 * animation clock before it advances anyway. Chosen above the map service's
 * per-layer tile-load timeout (5000ms) so a normally-slow load isn't cut off,
 * while a genuinely stuck frame can't freeze playback indefinitely.
 */
export const DEFAULT_MAX_WAIT_MS = 10000;

/** The subset of animation state the frame math reads. The reducer `State` satisfies it. */
export interface AnimationFrameState {
  selectedStartDateTime: DateTime.DateTime;
  selectedDuration: Duration.Duration;
  animationStartDateTime: DateTime.DateTime;
  animationDuration: Duration.Duration;
}

/**
 * Pure next-frame computation shared by the fixed-timer and back-pressure paths.
 * Advances `selectedStartDateTime` by `advanceMs` — forwards for a positive
 * speed, backwards for a negative one — wrapping around at whichever end of the
 * animation range playback is travelling towards: forwards past the range end
 * loops to `animationStartDateTime`, backwards past the range start loops to the
 * last frame that fits inside the range.
 */
export const computeNextAnimationFrame = (
  currentState: AnimationFrameState,
  advanceMs: number
): { nextStart: DateTime.DateTime; frame: FrameInfo } => {
  const reverse = advanceMs < 0;
  // Duration is unsigned (`Duration.millis(-1)` is zero), so a reverse frame
  // subtracts the magnitude rather than adding a negative — the same treatment
  // `stepFrom` gives a backwards step.
  const step = Duration.millis(Math.abs(advanceMs));
  const newStart = reverse
    ? DateTime.subtractDuration(currentState.selectedStartDateTime, step)
    : DateTime.addDuration(currentState.selectedStartDateTime, step);
  const animationEnd = DateTime.addDuration(
    currentState.animationStartDateTime,
    currentState.animationDuration
  );
  // Reached the end of the animation range in the direction of travel → loop
  // back to the far end. Running forwards that is the first frame that fits
  // (the range start); running backwards it is the last one (range end minus
  // the selection width), so the wrapped frame stays inside the range.
  let nextStart: DateTime.DateTime;
  if (reverse) {
    nextStart = DateTime.lessThan(newStart, currentState.animationStartDateTime)
      ? DateTime.subtractDuration(animationEnd, currentState.selectedDuration)
      : newStart;
  } else {
    const newEnd = DateTime.addDuration(newStart, currentState.selectedDuration);
    nextStart = DateTime.greaterThan(newEnd, animationEnd)
      ? currentState.animationStartDateTime
      : newStart;
  }
  const end = DateTime.addDuration(nextStart, currentState.selectedDuration);
  return { nextStart, frame: { start: nextStart, end } };
};

/**
 * Builds the back-pressure animation loop as an interruptible Effect. Each
 * iteration dispatches the next frame, then waits for the LONGER of `frameMs`
 * and `onFrameSettled(frame)` (capped by `maxWaitMs`) before repeating — so the
 * frame frequency is a ceiling and playback never outruns tile loads. Run with
 * `Effect.runFork` and stop with `Fiber.interrupt`.
 */
export const makeAnimationLoopEffect = (params: {
  readState: () => AnimationFrameState;
  advanceMs: number;
  frameMs: number;
  dispatchFrame: (nextStart: DateTime.DateTime) => void;
  onFrameSettled: (frame: FrameInfo) => Promise<void>;
  maxWaitMs: number;
}) => {
  const { readState, advanceMs, frameMs, dispatchFrame, onFrameSettled, maxWaitMs } = params;
  const iteration = Effect.gen(function* () {
    const { nextStart, frame } = computeNextAnimationFrame(readState(), advanceMs);
    yield* Effect.sync(() => dispatchFrame(nextStart));
    const settled = Effect.tryPromise(() => onFrameSettled(frame)).pipe(
      Effect.timeout(Duration.millis(maxWaitMs)),
      Effect.catchAll(() => Effect.void)
    );
    // concurrency: 'unbounded' runs both arms at once, so the iteration ends when
    // the LONGER finishes → period = max(frameMs, settle time).
    yield* Effect.all([settled, Effect.sleep(Duration.millis(frameMs))], {
      concurrency: 'unbounded',
    });
  });
  return Effect.forever(iteration);
};
