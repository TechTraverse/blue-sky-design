/**
 * Text for the instant-mode readout and the track's time axis. Zones are IANA
 * names (or "UTC"), as `getDisplayZone` returns them.
 */

import { DateTime } from 'effect';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const formatter = (zone: string, options: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, ...options });
  } catch {
    // An unknown zone name: fall back to UTC rather than throwing in render.
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options });
  }
};

/** 24-hour "HH:mm" in `zone`. */
export const formatClockTime = (date: Date, zone: string) =>
  formatter(zone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);

/** "Sun, Nov 1, 2026" in `zone`. */
export const formatReadoutDate = (date: Date, zone: string) =>
  formatter(zone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date);

/**
 * The zone's short name at `date`: "MST" or "MDT" for America/Denver, "UTC" for
 * UTC. Zones without a common abbreviation come back as an offset ("GMT+2").
 */
export const zoneAbbreviation = (date: Date, zone: string) => {
  if (zone === 'UTC') return 'UTC';
  const part = formatter(zone, { timeZoneName: 'short' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? zone;
};

/** A wall-clock time as typed: month is 1-based. */
export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}

/**
 * The instant at which the clock in `zone` reads `wall`. A time typed under
 * "Time (UTC)" is UTC whatever zone the browser is in. Across a daylight-saving
 * change, a repeated time is the earlier one and a skipped time moves forward.
 */
export const wallClockToDate = (wall: WallClock, zone: string): Date => {
  const parts = {
    year: wall.year, month: wall.month, day: wall.day,
    hours: wall.hour ?? 0, minutes: wall.minute ?? 0, seconds: wall.second ?? 0, millis: wall.millisecond ?? 0,
  };
  const utc = () => new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, parts.seconds, parts.millis));
  if (zone === 'UTC') return utc();
  try {
    // toEpochMillis, not toDate: toDate of a zoned value is its wall clock, not the instant.
    return new Date(DateTime.toEpochMillis(
      DateTime.unsafeMakeZoned(parts, { timeZone: zone, adjustForTimeZone: true })));
  } catch {
    // An unknown zone name, as in `formatter`.
    return utc();
  }
};

/**
 * How long ago, coarsened to what a reader needs: "4 min ago", "1 h 40 min ago", "2 d 3 h ago",
 * and days alone from a week back.
 */
export const formatAgo = (ms: number) => {
  if (ms < MINUTE_MS) return 'just now';
  const totalMinutes = Math.floor(ms / MINUTE_MS);
  if (totalMinutes < 60) return `${totalMinutes} min ago`;
  const totalHours = Math.floor(ms / HOUR_MS);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${totalHours} h ago` : `${totalHours} h ${minutes} min ago`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours === 0 || days >= 7 ? `${days} d ago` : `${days} d ${hours} h ago`;
};

/** Hour-label spacings the axis can use, smallest first. */
const HOUR_LABEL_INTERVALS = [1, 2, 3, 6, 12, 24];
/** Room an "HH:00" label needs, with a gap. */
const MIN_HOUR_LABEL_PX = 48;
/** Room the ":30" labels need between two hour labels. */
const MIN_HALF_LABEL_PX_PER_HOUR = 110;

/**
 * How densely the axis can label at `pxPerHour`: hour labels every
 * `hourInterval` hours, and ":30" labels only when there is room for them.
 */
export const axisLabelDensity = (pxPerHour: number) => {
  const hourInterval = HOUR_LABEL_INTERVALS.find((h) => h * pxPerHour >= MIN_HOUR_LABEL_PX)
    ?? HOUR_LABEL_INTERVALS[HOUR_LABEL_INTERVALS.length - 1];
  return { hourInterval, halfHourLabels: pxPerHour >= MIN_HALF_LABEL_PX_PER_HOUR };
};

export type AxisMarkKind = 'day' | 'hour' | 'half' | 'minor';

/** What a mark at display-local `hours:minutes` is. */
export const axisMarkKind = (hours: number, minutes: number): AxisMarkKind =>
  minutes === 0 ? (hours === 0 ? 'day' : 'hour') : minutes === 30 ? 'half' : 'minor';
