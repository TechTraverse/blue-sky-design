import _ from "lodash";
import f from 'lodash/fp';
import type { RangeValue } from "@react-types/shared";
import { CalendarDate, getDayOfWeek as _getDayOfWeek } from "@internationalized/date";
import type { Duration } from "effect";
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

const getDaysForMonth = (state: RangeCalendarState, duration: Duration.Duration) => _.flow([
  ({ start, end }: RangeValue<CalendarDate>) => {
    const entries: CalendarDate[] = [];
    for (let date = start; date <= end; date = date.add({ days: 1 })) {
      entries.push(date);
    }
    return entries;
  },
  f.map(getDayData)
])(state.value);

export const HorizontalCalendar = ({ state, duration }: { state: RangeCalendarState, duration: Duration.Duration }) => {
  const { /* gridProps, headerProps, */ weekDays, weeksInMonth } = useCalendarGrid(
    {},
    state
  );
  const month = state.visibleRange.start.month;
  const year = state.visibleRange.start.year;

  return (<>
    <div className="month-header">{`${month}/${year}`}</div>
    <table>
      <tbody className="horizontal-calendar-grid-body">
        <tr>
          {getDaysForMonth(state, duration).map((d: DayData) =>
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
