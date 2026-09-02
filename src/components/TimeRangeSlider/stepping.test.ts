import { describe, expect, it } from 'vitest';
import { DateTime, Duration } from 'effect';
import { resolveStepMs, stepFrom, stepSelection } from './stepping';

const at = (iso: string) => DateTime.unsafeFromDate(new Date(iso));
const iso = (dt: DateTime.DateTime) => DateTime.toDate(dt).toISOString();

describe('resolveStepMs', () => {
  it('uses stepSizeMs when given, independently of the window width', () => {
    // The reported gap: a 5-minute window could not step 30 seconds.
    expect(resolveStepMs(30_000, Duration.minutes(5))).toBe(30_000);
  });

  it('falls back to the window width when stepSizeMs is absent', () => {
    expect(resolveStepMs(undefined, Duration.minutes(5))).toBe(300_000);
  });

  it('rejects non-positive and non-finite step sizes', () => {
    expect(resolveStepMs(0, Duration.minutes(5))).toBe(300_000);
    expect(resolveStepMs(-60_000, Duration.minutes(5))).toBe(300_000);
    expect(resolveStepMs(Number.NaN, Duration.minutes(5))).toBe(300_000);
  });
});

describe('stepFrom', () => {
  it('advances one step forward', () => {
    const stepMs = resolveStepMs(60_000, Duration.minutes(5));
    const next = stepFrom(at('2026-09-04T13:01:00Z'), stepMs, 1);
    expect(iso(next)).toBe('2026-09-04T13:02:00.000Z');
  });

  it('advances one step backward', () => {
    const stepMs = resolveStepMs(60_000, Duration.minutes(5));
    const prev = stepFrom(at('2026-09-04T13:01:00Z'), stepMs, -1);
    expect(iso(prev)).toBe('2026-09-04T13:00:00.000Z');
  });
});

describe('stepSelection', () => {
  it('translates a 5-minute window by a 1-minute step without resizing it', () => {
    const width = Duration.minutes(5);
    const next = stepSelection(at('2026-09-04T13:01:00Z'), resolveStepMs(60_000, width), 1, width);
    expect([iso(next.start), iso(next.end)])
      .toEqual(['2026-09-04T13:02:00.000Z', '2026-09-04T13:07:00.000Z']);
  });

  it('keeps the width when stepping backward', () => {
    const width = Duration.minutes(5);
    const prev = stepSelection(at('2026-09-04T13:01:00Z'), resolveStepMs(60_000, width), -1, width);
    expect([iso(prev.start), iso(prev.end)])
      .toEqual(['2026-09-04T13:00:00.000Z', '2026-09-04T13:05:00.000Z']);
  });
});
