import { describe, expect, it } from 'vitest';
import { DateTime, Duration } from 'effect';
import { isStepBlocked, makeStepLattice, stepSelection, type StepDirection } from './stepping';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime) => DateTime.toDate(dt).toISOString();

const LATEST = '2026-08-22T13:05:31Z';
const width = Duration.minutes(5);
const stepMs = 300_000;
const lattice = makeStepLattice(new Date('2026-08-22T13:00:31Z'), 0, stepMs);

/** Steps forward until the clamp refuses, and reports where it stopped. */
const walkForward = (range: { min: DateTime.DateTime; max: DateTime.DateTime }) => {
  let cursor = at('2026-08-22T12:30:31Z');
  for (let i = 0; i < 100; i++) {
    const { start, end } = stepSelection(cursor, stepMs, 1, width, lattice);
    if (isStepBlocked(start, end, 1, range)) break;
    cursor = start;
  }
  return { start: cursor, end: DateTime.addDuration(cursor, width) };
};

describe('forward ceiling', () => {
  it('reaches the newest frame when the range ends at it', () => {
    const reached = walkForward({ min: at('2026-08-22T00:00:00Z'), max: at(LATEST) });
    expect(iso(reached.end)).toBe('2026-08-22T13:05:31.000Z');
  });

  it('stops five minutes short when the ceiling is the old latest-minus-window value', () => {
    // dateRangeForReset.start was read as the maximum, and wlfs-client sets it to
    // `latest - 5min` — the reported silent no-op near the leading edge.
    const oldCeiling = DateTime.subtractDuration(at(LATEST), width);
    const reached = walkForward({ min: at('2026-08-22T00:00:00Z'), max: oldCeiling });
    expect(iso(reached.end)).toBe('2026-08-22T13:00:31.000Z');
  });
});

describe('isStepBlocked', () => {
  const range = { min: at('2026-08-22T12:00:31Z'), max: at(LATEST) };

  it('refuses a forward step whose end passes the ceiling', () => {
    const { start, end } = stepSelection(at('2026-08-22T13:00:31Z'), stepMs, 1, width, lattice);
    expect(isStepBlocked(start, end, 1, range)).toBe(true);
  });

  it('allows a forward step landing exactly on the ceiling', () => {
    const { start, end } = stepSelection(at('2026-08-22T12:55:31Z'), stepMs, 1, width, lattice);
    expect(isStepBlocked(start, end, 1, range)).toBe(false);
  });

  it('refuses a backward step below the floor', () => {
    const { start, end } = stepSelection(at('2026-08-22T12:00:31Z'), stepMs, -1, width, lattice);
    expect(isStepBlocked(start, end, -1, range)).toBe(true);
  });

  it('only applies the bound in the direction of travel, so an out-of-range selection can step back in', () => {
    const below = at('2026-08-22T11:00:31Z');
    const { start, end } = stepSelection(below, stepMs, 1, width, lattice);
    expect(isStepBlocked(start, end, 1, range)).toBe(false);
  });

  it.each<[string, StepDirection]>([['forward', 1], ['backward', -1]])(
    'imposes no %s bound without a selectable range', (_label, direction) => {
      const { start, end } = stepSelection(at(LATEST), stepMs, direction, width, lattice);
      expect(isStepBlocked(start, end, direction, undefined)).toBe(false);
    });
});
