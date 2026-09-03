import { describe, it, expect } from "vitest";
import { Effect, Fiber, DateTime, Duration } from "effect";
import {
  computeNextAnimationFrame,
  makeAnimationLoopEffect,
  type AnimationFrameState,
} from "./animationFrame";

const mkState = (
  startMs: number,
  durMs: number,
  animStartMs: number,
  animDurMs: number,
): AnimationFrameState => ({
  selectedStartDateTime: DateTime.unsafeFromDate(new Date(startMs)),
  selectedDuration: Duration.millis(durMs),
  animationStartDateTime: DateTime.unsafeFromDate(new Date(animStartMs)),
  animationDuration: Duration.millis(animDurMs),
});

/** Flush pending microtasks + macrotasks so queued Effect fibers can run. */
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("computeNextAnimationFrame", () => {
  it("advances by advanceMs while inside the animation range", () => {
    const { nextStart, frame } = computeNextAnimationFrame(
      mkState(1000, 100, 0, 100000),
      500,
    );
    expect(DateTime.toEpochMillis(nextStart)).toBe(1500);
    expect(DateTime.toEpochMillis(frame.start)).toBe(1500);
    expect(DateTime.toEpochMillis(frame.end)).toBe(1600);
  });

  it("loops back to animationStart once the frame passes the range end", () => {
    // newStart=1050, newEnd=1150 > animEnd=1000 → loop back to animationStart (0).
    const { nextStart, frame } = computeNextAnimationFrame(
      mkState(950, 100, 0, 1000),
      100,
    );
    expect(DateTime.toEpochMillis(nextStart)).toBe(0);
    expect(DateTime.toEpochMillis(frame.start)).toBe(0);
    expect(DateTime.toEpochMillis(frame.end)).toBe(100);
  });

  // Regression: `Duration` is unsigned, so `Duration.millis(-500)` is zero and a
  // negative `AnimationSpeed` used to leave the clock standing still.
  it("runs the clock backwards for a negative advanceMs", () => {
    const { nextStart, frame } = computeNextAnimationFrame(
      mkState(1000, 100, 0, 100000),
      -500,
    );
    expect(DateTime.toEpochMillis(nextStart)).toBe(500);
    expect(DateTime.toEpochMillis(frame.start)).toBe(500);
    expect(DateTime.toEpochMillis(frame.end)).toBe(600);
  });

  it("loops back to the range end once a reverse frame passes the range start", () => {
    // newStart=-50 < animStart=0 → wrap to the last frame that fits:
    // animEnd(1000) - selectedDuration(100) = 900.
    const { nextStart, frame } = computeNextAnimationFrame(
      mkState(50, 100, 0, 1000),
      -100,
    );
    expect(DateTime.toEpochMillis(nextStart)).toBe(900);
    expect(DateTime.toEpochMillis(frame.start)).toBe(900);
    expect(DateTime.toEpochMillis(frame.end)).toBe(1000);
  });

  it("does not wrap a reverse frame that lands exactly on the range start", () => {
    const { nextStart } = computeNextAnimationFrame(mkState(100, 100, 0, 1000), -100);
    expect(DateTime.toEpochMillis(nextStart)).toBe(0);
  });
});

describe("makeAnimationLoopEffect (back-pressure)", () => {
  it("advances one frame per onFrameSettled resolution and never ahead of it", async () => {
    const dispatches: number[] = [];
    const resolvers: Array<() => void> = [];
    const loop = makeAnimationLoopEffect({
      readState: () => mkState(0, 100, 0, 10_000_000),
      advanceMs: 100,
      frameMs: 0, // isolate the gate: period is driven purely by onFrameSettled
      dispatchFrame: () => dispatches.push(1),
      onFrameSettled: () => new Promise<void>((res) => resolvers.push(res)),
      maxWaitMs: 1_000_000, // effectively no cap for this test
    });

    const fiber = Effect.runFork(loop);
    await tick();
    // First frame dispatched, now blocked waiting for its settle.
    expect(dispatches.length).toBe(1);
    expect(resolvers.length).toBe(1);

    resolvers[0]();
    await tick();
    expect(dispatches.length).toBe(2);

    resolvers[1]();
    await tick();
    expect(dispatches.length).toBe(3);

    // With no further settle, the loop must not advance.
    await tick();
    expect(dispatches.length).toBe(3);

    Effect.runFork(Fiber.interrupt(fiber));
    await tick();
  });

  it("dispatches receding frames when the speed is negative", async () => {
    const dispatches: number[] = [];
    const resolvers: Array<() => void> = [];
    // The fiber re-reads state each iteration; feed it back the last dispatch so
    // successive frames compound instead of restarting from the same instant.
    let start = 10_000;
    const loop = makeAnimationLoopEffect({
      readState: () => mkState(start, 100, 0, 10_000_000),
      advanceMs: -100,
      frameMs: 0,
      dispatchFrame: (nextStart) => {
        start = DateTime.toEpochMillis(nextStart);
        dispatches.push(start);
      },
      onFrameSettled: () => new Promise<void>((res) => resolvers.push(res)),
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

    expect(dispatches.slice(0, 3)).toEqual([9900, 9800, 9700]);
  });

  it("maxWaitMs caps a stalled onFrameSettled so playback still advances", async () => {
    const dispatches: number[] = [];
    const loop = makeAnimationLoopEffect({
      readState: () => mkState(0, 100, 0, 10_000_000),
      advanceMs: 100,
      frameMs: 0,
      dispatchFrame: () => dispatches.push(1),
      onFrameSettled: () => new Promise<void>(() => {}), // never resolves
      maxWaitMs: 20,
    });

    const fiber = Effect.runFork(loop);
    await new Promise((r) => setTimeout(r, 120));
    Effect.runFork(Fiber.interrupt(fiber));
    await tick();

    // ~120ms / 20ms ≈ 6 advances; wide band absorbs scheduler variance while
    // still proving the clock advances without any settle.
    expect(dispatches.length).toBeGreaterThanOrEqual(2);
    expect(dispatches.length).toBeLessThanOrEqual(12);
  });
});
