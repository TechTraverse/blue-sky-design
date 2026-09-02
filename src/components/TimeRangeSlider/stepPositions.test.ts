import { describe, expect, it } from 'vitest';
import { DateTime, Duration } from 'effect';
import {
  adjacentPosition,
  makeStepLattice,
  normalizeStepPositions,
  stepSelection,
} from './stepping';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime | undefined) =>
  dt && DateTime.toDate(dt).toISOString();

// A CONUS-shaped index: 5-minute cadence at :31 past the minute.
const frames = normalizeStepPositions([
  new Date('2026-08-22T12:50:31Z'),
  new Date('2026-08-22T12:55:31Z'),
  new Date('2026-08-22T13:00:31Z'),
  new Date('2026-08-22T13:05:31Z'),
])!;

describe('normalizeStepPositions', () => {
  it('sorts, dedupes and drops invalid instants', () => {
    const out = normalizeStepPositions([
      new Date('2026-08-22T13:00:31Z'),
      new Date('2026-08-22T12:55:31Z'),
      new Date('2026-08-22T13:00:31Z'),
      new Date(Number.NaN),
    ]);
    expect(out).toEqual([
      Date.parse('2026-08-22T12:55:31Z'),
      Date.parse('2026-08-22T13:00:31Z'),
    ]);
  });

  it('treats an empty or absent list as no list at all', () => {
    expect(normalizeStepPositions([])).toBeUndefined();
    expect(normalizeStepPositions(undefined)).toBeUndefined();
    expect(normalizeStepPositions([new Date(Number.NaN)])).toBeUndefined();
  });
});

describe('adjacentPosition', () => {
  it('walks to the neighbouring observed frame from an on-frame cursor', () => {
    expect(iso(adjacentPosition(at('2026-08-22T13:00:31Z'), frames, -1)))
      .toBe('2026-08-22T12:55:31.000Z');
    expect(iso(adjacentPosition(at('2026-08-22T13:00:31Z'), frames, 1)))
      .toBe('2026-08-22T13:05:31.000Z');
  });

  it('walks to the neighbouring frame from a cursor between frames', () => {
    expect(iso(adjacentPosition(at('2026-08-22T12:58:00Z'), frames, -1)))
      .toBe('2026-08-22T12:55:31.000Z');
    expect(iso(adjacentPosition(at('2026-08-22T12:58:00Z'), frames, 1)))
      .toBe('2026-08-22T13:00:31.000Z');
  });

  it('has no answer at either end of the pushed span', () => {
    expect(adjacentPosition(at('2026-08-22T13:05:31Z'), frames, 1)).toBeUndefined();
    expect(adjacentPosition(at('2026-08-22T12:50:31Z'), frames, -1)).toBeUndefined();
  });

  it('has no answer outside the pushed span', () => {
    expect(adjacentPosition(at('2026-08-22T10:00:00Z'), frames, 1)).toBeUndefined();
    expect(adjacentPosition(at('2026-08-22T14:00:00Z'), frames, -1)).toBeUndefined();
  });

  it('walks a single-entry list off both ends', () => {
    const one = normalizeStepPositions([new Date('2026-08-22T13:00:31Z')])!;
    expect(adjacentPosition(at('2026-08-22T13:00:31Z'), one, -1)).toBeUndefined();
    expect(adjacentPosition(at('2026-08-22T13:00:31Z'), one, 1)).toBeUndefined();
  });
});

describe('stepSelection resolution', () => {
  const width = Duration.minutes(5);
  const lattice = makeStepLattice(new Date('2026-08-22T13:00:31Z'), 0, 300_000);

  it('prefers observed frames inside the index', () => {
    const r = stepSelection(at('2026-08-22T13:00:31Z'), 300_000, -1, width, lattice, frames);
    expect([iso(r.start), r.resolvedBy]).toEqual(['2026-08-22T12:55:31.000Z', 'positions']);
  });

  it('falls back to lattice arithmetic beyond the index, without a lookup', () => {
    const r = stepSelection(at('2026-08-22T11:00:31Z'), 300_000, -1, width, lattice, frames);
    expect([iso(r.start), r.resolvedBy]).toEqual(['2026-08-22T10:55:31.000Z', 'lattice']);
  });

  it('falls back at the leading edge of the index', () => {
    const r = stepSelection(at('2026-08-22T13:05:31Z'), 300_000, 1, width, lattice, frames);
    expect([iso(r.start), r.resolvedBy]).toEqual(['2026-08-22T13:10:31.000Z', 'lattice']);
  });
});
