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
export type FrameAdvance = {
    mode: 'fixed';
} | {
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
export declare const DEFAULT_MAX_WAIT_MS = 10000;
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
export declare const computeNextAnimationFrame: (currentState: AnimationFrameState, advanceMs: number) => {
    nextStart: DateTime.DateTime;
    frame: FrameInfo;
};
/**
 * Builds the back-pressure animation loop as an interruptible Effect. Each
 * iteration dispatches the next frame, then waits for the LONGER of `frameMs`
 * and `onFrameSettled(frame)` (capped by `maxWaitMs`) before repeating — so the
 * frame frequency is a ceiling and playback never outruns tile loads. Run with
 * `Effect.runFork` and stop with `Fiber.interrupt`.
 */
export declare const makeAnimationLoopEffect: (params: {
    readState: () => AnimationFrameState;
    advanceMs: number;
    frameMs: number;
    dispatchFrame: (nextStart: DateTime.DateTime) => void;
    onFrameSettled: (frame: FrameInfo) => Promise<void>;
    maxWaitMs: number;
}) => Effect.Effect<never, never, never>;
