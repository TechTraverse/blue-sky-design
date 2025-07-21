import _ from "lodash";
import f from 'lodash/fp';
import type { RangeValue } from "@react-types/shared";
import { CalendarDate, getDayOfWeek as _getDayOfWeek, type DateValue } from "@internationalized/date";
import { DateTime, type Duration } from "effect";
import { useCalendarGrid } from 'react-aria';
import type { RangeCalendarState } from "react-stately";

type DayData = Pick<CalendarDate, 'year' | 'month' | 'day'> & {
  dayOfWeek: string;
}

const getDayOfWeek = (date: CalendarDate): string => {
  const weekDayIndex = _getDayOfWeek(date, 'en-US');
  switch (weekDayIndex) {
    case 0: return 'S';
    case 1: return 'M';
    case 2: return 'T';
    case 3: return 'W';
    case 4: return 'T';
    case 5: return 'F';
    case 6: return 'S';
    default: return '';
  }
};

const getDayData = (date: CalendarDate): DayData => ({
  ...date,
  dayOfWeek: getDayOfWeek(date),
});

const getDaysForMonth = (range: RangeValue<DateValue> | null) => _.flow([
  ({ start, end }: RangeValue<CalendarDate>) => {
    const entries: CalendarDate[] = [];
    for (let date = start; date <= end; date = date.add({ days: 1 })) {
      entries.push(date);
    }
    return entries;
  },
  f.map(getDayData)
])(range);

export const HorizontalCalendar = ({ state, duration, viewStartDateTime }: { state: RangeCalendarState, duration: Duration.Duration, viewStartDateTime: DateTime.DateTime }) => {
  // const calendarGrid = useCalendarGrid({}, state);
  const { month, year } = state.visibleRange.start;
  const start = new CalendarDate(
    DateTime.getPart(viewStartDateTime, 'year'),
    DateTime.getPart(viewStartDateTime, 'month'),
    DateTime.getPart(viewStartDateTime, 'day')
  );
  const _end = DateTime.addDuration(viewStartDateTime, duration);
  const end = new CalendarDate(
    DateTime.getPart(_end, 'year'),
    DateTime.getPart(_end, 'month'),
    DateTime.getPart(viewStartDateTime, 'day')
  );
  const rangeValue: RangeValue<DateValue> = { start, end };
  console.log('HorizontalCalendar', { duration, rangeValue });

  return (<>
    <div className="month-header">{`${month}/${year}`}</div>
    <table>
      <tbody className="horizontal-calendar-grid-body">
        <tr>
          {getDaysForMonth(rangeValue).map((d: DayData) =>
          (<td key={`${d.year}-${d.month}-${d.day}`}>
            <div className="horizontal-day-column">
              <div>
                {d.dayOfWeek}
              </div>
              <div>
                {d.day}
              </div>
            </div>
          </td>))}
        </tr>
      </tbody>
    </table>
  </>);
}
