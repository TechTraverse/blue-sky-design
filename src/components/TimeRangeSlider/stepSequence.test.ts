import { describe, expect, it } from 'vitest';
import { DateTime, Duration } from 'effect';
import {
  acceptsTrackLatestRebase,
  adjacentLatticePosition,
  makeStepLattice,
  nextStepPosition,
  resolveStepMs,
  sequenceCursor,
  type StepDirection,
} from './stepping';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime) => DateTime.toDate(dt).toISOString();

/**
 * Walks a step sequence the way the reducer does: from the recorded cursor, with
 * a track-latest poll trying to re-base the selection between clicks.
 */
const walk = (opts: {
  anchor: Date;
  phaseMs?: number;
  stepMs: number;
  clicks: number;
  direction: StepDirection;
  /** Epoch ms the poll would re-base the selection to, per click. */
  pollRebase?: (click: number) => number | null;
  /** Set false to model the pre-fix behaviour: steps re-read the shared cell. */
  anchored?: boolean;
}) => {
  const lattice = makeStepLattice(opts.anchor, opts.phaseMs, opts.stepMs);
  let cursor: DateTime.DateTime | null = null;
  let selected = DateTime.unsafeFromDate(opts.anchor);

  for (let click = 1; click <= opts.clicks; click++) {
    // The 60s poll fires between clicks, part-way into the sequence.
    const rebase = click > 1 ? (opts.pollRebase?.(click) ?? null) : null;
    if (rebase !== null && (opts.anchored === false || acceptsTrackLatestRebase(cursor))) {
      selected = DateTime.unsafeMake(rebase);
    }

    // Pre-fix: no lattice and no recorded cursor — just `sharedCell -/+ duration`.
    const from = opts.anchored === false ? selected : sequenceCursor(cursor, selected);
    const to = nextStepPosition(
      from, opts.stepMs, opts.direction, opts.anchored === false ? undefined : lattice);
    cursor = to;
    selected = to;
  }
  return selected;
};

describe('step sequence anchoring', () => {
  const anchor = new Date('2026-08-22T13:01:00Z');
  const stepMs = resolveStepMs(undefined, Duration.minutes(5));
  const pollRebase = (n: number) => Date.parse('2026-08-22T12:58:00Z') + n * 60_000;

  it('lands exactly six steps back even while the poll re-bases the selection', () => {
    // Latest advances a minute per click, so the poll re-seeds the selection to
    // `latest - 5min` — 12:59, 13:00, ... 13:04 — as the sequence runs.
    const result = walk({ anchor, stepMs, clicks: 6, direction: -1, pollRebase });
    expect(iso(result)).toBe('2026-08-22T12:31:00.000Z');
  });

  it('reproduces the reported drift when steps re-read the shared selection cell', () => {
    // Pre-fix behaviour: each click reads whatever the poll last wrote, so six
    // clicks back from 13:01 land near 12:59 instead of 12:31.
    const result = walk({ anchor, stepMs, clicks: 6, direction: -1, pollRebase, anchored: false });
    expect(iso(result)).toBe('2026-08-22T12:59:00.000Z');
  });

  it('is deterministic: the same clicks from the same anchor give the same result', () => {
    const once = walk({ anchor, stepMs, clicks: 6, direction: -1 });
    const twice = walk({ anchor, stepMs, clicks: 6, direction: -1 });
    expect(iso(once)).toBe(iso(twice));
    expect(iso(once)).toBe('2026-08-22T12:31:00.000Z');
  });

  it('refuses a track-latest re-base only while a sequence is active', () => {
    expect(acceptsTrackLatestRebase(null)).toBe(true);
    expect(acceptsTrackLatestRebase(at('2026-08-22T13:01:00Z'))).toBe(false);
  });
});

describe('lattice phase', () => {
  // GOES frames sit at :31 past the minute, not on a round-minute grid.
  const lattice = makeStepLattice(new Date('2026-08-22T13:00:31Z'), 0, 300_000)!;

  it('steps back onto the phase-shifted lattice from an on-lattice cursor', () => {
    expect(iso(adjacentLatticePosition(at('2026-08-22T13:00:31Z'), lattice, -1)))
      .toBe('2026-08-22T12:55:31.000Z');
  });

  it('carries the anchor phase as a separate input', () => {
    const shifted = makeStepLattice(new Date('2026-08-22T13:00:00Z'), 31_000, 300_000)!;
    expect(shifted.originMs).toBe(Date.parse('2026-08-22T13:00:31Z'));
  });

  it('moves an off-lattice cursor to the adjacent position, not snap plus a step', () => {
    // Cursor scrubbed to 13:03:20; the neighbour below is 13:00:31, not 12:55:31.
    expect(iso(adjacentLatticePosition(at('2026-08-22T13:03:20Z'), lattice, -1)))
      .toBe('2026-08-22T13:00:31.000Z');
    expect(iso(adjacentLatticePosition(at('2026-08-22T13:03:20Z'), lattice, 1)))
      .toBe('2026-08-22T13:05:31.000Z');
  });

  it('keeps advancing on a fractional step size', () => {
    // DateTime truncates, so an unrounded lattice would land back on the cursor
    // and the button would silently do nothing.
    const fractional = makeStepLattice(new Date(0), 0, 100.5)!;
    let cursor = DateTime.unsafeMake(0);
    const walked: number[] = [];
    for (let i = 0; i < 3; i++) {
      cursor = adjacentLatticePosition(cursor, fractional, 1);
      walked.push(DateTime.toEpochMillis(cursor));
    }
    expect(walked).toEqual([101, 202, 303]);
  });

  it('rounds a fractional phase onto a whole millisecond', () => {
    expect(makeStepLattice(new Date(0), 0.5, 300_000)!.originMs).toBe(1);
  });

  it('falls back to free-running steps when the step is not a usable length', () => {
    // Reachable via resolveStepMs when dateRange has zero width; a zero step
    // makes the lattice arithmetic produce an invalid date.
    expect(makeStepLattice(new Date(0), 0, 0)).toBeUndefined();
    expect(makeStepLattice(new Date(0), 0, -300_000)).toBeUndefined();
    expect(makeStepLattice(new Date(0), 0, Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('falls back to free-running arithmetic without an anchor', () => {
    expect(makeStepLattice(undefined, 0, 300_000)).toBeUndefined();
    expect(iso(nextStepPosition(at('2026-08-22T13:03:20Z'), 300_000, -1, undefined)))
      .toBe('2026-08-22T12:58:20.000Z');
  });
});
