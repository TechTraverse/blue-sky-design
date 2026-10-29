import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TimeRangeSlider } from './TimeRangeSlider';
import { TimeZone } from './timeSliderTypes';
import { SetTimeZone, withMiddleware, reducer, type State } from './timeSliderReducer';

// A selection at 13:00 UTC, which is 07:00 in Denver (MDT in August).
const dateRange = { start: new Date('2026-08-22T13:00:00Z'), end: new Date('2026-08-22T13:05:00Z') };

// Text of the date picker: its label names the zone, then the date and time segments follow.
const pickerText = (timeZone?: TimeZone) => {
  const html = renderToStaticMarkup(createElement(TimeRangeSlider, {
    dateRange,
    onDateRangeSelect: () => {},
    ...(timeZone ? { timeZone } : {}),
  }));
  const text = html.replace(/<style[^>]*>.*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/[⁦-⁩]/g, '').replace(/\s+/g, ' ');
  return text.match(/Start Date \([^)]*\) [\d /]+ , [\d :]+/)?.[0].trim();
};

describe('TimeRangeSlider timeZone', () => {
  const originalTz = process.env.TZ;
  beforeAll(() => { process.env.TZ = 'America/Denver'; });
  afterAll(() => { process.env.TZ = originalTz; });

  it('shows UTC times when the prop is UTC', () => {
    expect(pickerText(TimeZone.UTC)).toBe('Start Date (UTC) 08 / 22 / 2026 , 13 : 00');
  });

  it('shows local times when the prop is Local', () => {
    expect(pickerText(TimeZone.Local)).toBe('Start Date (America/Denver) 08 / 22 / 2026 , 07 : 00');
  });

  it('defaults to local', () => {
    expect(pickerText()).toBe(pickerText(TimeZone.Local));
  });
});

describe('time zone change callback', () => {
  const state = { timeZone: TimeZone.Local } as State;
  const run = (onTimeZoneChange: (tz: TimeZone) => void, from: TimeZone, to: TimeZone) =>
    withMiddleware(reducer, () => {}, (dt) => dt, onTimeZoneChange)(
      { ...state, timeZone: from }, SetTimeZone({ timeZone: to }));

  it('reports a user switch', () => {
    const onTimeZoneChange = vi.fn();
    expect(run(onTimeZoneChange, TimeZone.Local, TimeZone.UTC).timeZone).toBe(TimeZone.UTC);
    expect(onTimeZoneChange).toHaveBeenCalledWith(TimeZone.UTC);
  });

  it('stays quiet when the zone does not change', () => {
    const onTimeZoneChange = vi.fn();
    run(onTimeZoneChange, TimeZone.UTC, TimeZone.UTC);
    expect(onTimeZoneChange).not.toHaveBeenCalled();
  });
});
