import { describe, expect, it } from 'vitest';
import {
  axisLabelDensity,
  axisMarkKind,
  formatAgo,
  formatClockTime,
  formatReadoutDate,
  zoneAbbreviation,
} from './timeLabels';

const MIN = 60_000;
const HOUR = 60 * MIN;

describe('readout text', () => {
  // 2026-11-02T01:05Z is 18:05 on Nov 1 in Denver, the first evening of standard time.
  const instant = new Date('2026-11-02T01:05:00Z');

  it('formats the time on a 24-hour clock in the display zone', () => {
    expect(formatClockTime(instant, 'America/Denver')).toBe('18:05');
    expect(formatClockTime(instant, 'UTC')).toBe('01:05');
    expect(formatClockTime(new Date('2026-11-02T07:00:00Z'), 'America/Denver')).toBe('00:00');
  });

  it('formats the date with the weekday in the display zone', () => {
    expect(formatReadoutDate(instant, 'America/Denver')).toBe('Sun, Nov 1, 2026');
    expect(formatReadoutDate(instant, 'UTC')).toBe('Mon, Nov 2, 2026');
  });

  it('names the zone by its abbreviation, following daylight time', () => {
    expect(zoneAbbreviation(instant, 'America/Denver')).toBe('MST');
    expect(zoneAbbreviation(new Date('2026-07-01T18:00:00Z'), 'America/Denver')).toBe('MDT');
    expect(zoneAbbreviation(instant, 'UTC')).toBe('UTC');
  });

  it('falls back to UTC for a zone name Intl does not know', () => {
    expect(formatClockTime(instant, 'Not/AZone')).toBe('01:05');
  });
});

describe('formatAgo', () => {
  it('coarsens to minutes, hours and minutes, then days and hours', () => {
    expect(formatAgo(20_000)).toBe('just now');
    expect(formatAgo(4 * MIN + 59_000)).toBe('4 min ago');
    expect(formatAgo(60 * MIN)).toBe('1 h ago');
    expect(formatAgo(100 * MIN)).toBe('1 h 40 min ago');
    expect(formatAgo(48 * HOUR)).toBe('2 d ago');
    expect(formatAgo(51 * HOUR + 30 * MIN)).toBe('2 d 3 h ago');
    expect(formatAgo(469 * 24 * HOUR + 23 * HOUR)).toBe('469 d ago');
  });
});

describe('axis labels', () => {
  it('classifies marks by their display-local time', () => {
    expect(axisMarkKind(0, 0)).toBe('day');
    expect(axisMarkKind(17, 0)).toBe('hour');
    expect(axisMarkKind(17, 30)).toBe('half');
    expect(axisMarkKind(17, 5)).toBe('minor');
  });

  it('labels every hour and half hour on a wide track', () => {
    // 600px over 3 hours
    expect(axisLabelDensity(200)).toEqual({ hourInterval: 1, halfHourLabels: true });
  });

  it('drops the half hours, then spaces the hours out as the track narrows', () => {
    // 600px over 11 hours (a 30-minute step's view)
    expect(axisLabelDensity(600 / 11)).toEqual({ hourInterval: 1, halfHourLabels: false });
    // 240px over 6 hours
    expect(axisLabelDensity(40)).toEqual({ hourInterval: 2, halfHourLabels: false });
    expect(axisLabelDensity(10)).toEqual({ hourInterval: 6, halfHourLabels: false });
    expect(axisLabelDensity(1)).toEqual({ hourInterval: 24, halfHourLabels: false });
  });
});
