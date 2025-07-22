import "./horizontalCalendar.css";
import _, { chunk } from "lodash";
import f from 'lodash/fp';
import type { RangeValue } from "@react-types/shared";
import { CalendarDate, getDayOfWeek as _getDayOfWeek, type DateValue } from "@internationalized/date";
import { DateTime, Duration } from "effect";
import { useCalendarGrid, useLocale } from 'react-aria';
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

const getMonth = (number: number): string => {
  switch (number) {
    case 1: return 'January';
    case 2: return 'February';
    case 3: return 'March';
    case 4: return 'April';
    case 5: return 'May';
    case 6: return 'June';
    case 7: return 'July';
    case 8: return 'August';
    case 9: return 'September';
    case 10: return 'October';
    case 11: return 'November';
    case 12: return 'December';
    default: return '';
  }
}

const getDayData = (date: CalendarDate): DayData => ({
  ...date,
  dayOfWeek: getDayOfWeek(date),
});

const getDaysInRange = (range: RangeValue<DateValue> | null) => _.flow([
  ({ start, end }: RangeValue<CalendarDate>) => {
    const entries: CalendarDate[] = [];
    for (let date = start; date <= end; date = date.add({ days: 1 })) {
      entries.push(date);
    }
    return entries;
  },
  f.map(getDayData),
])(range);

const chunkDaysByMonth = (days: DayData[]) => {
  const grouped = _.groupBy(days, (d: DayData) => `${d.year}-${d.month}`);
  const sortedKVArr = _.sortBy(Object.entries(grouped), ["0"]);
  return sortedKVArr.map(([, value]) => value);
}

export const HorizontalCalendar = ({ duration, viewStartDateTime }: {
  duration: Duration.Duration,
  viewStartDateTime: DateTime.DateTime
}) => {

  // const calendarGrid = useCalendarGrid({}, state);
  const start = new CalendarDate(
    DateTime.getPart(viewStartDateTime, 'year'),
    DateTime.getPart(viewStartDateTime, 'month'),
    DateTime.getPart(viewStartDateTime, 'day'));

  const _end = DateTime.addDuration(viewStartDateTime, duration);
  const end = new CalendarDate(
    DateTime.getPart(_end, 'year'),
    DateTime.getPart(_end, 'month'),
    DateTime.getPart(_end, 'day'));

  const rangeValue: RangeValue<DateValue> = { start, end };
  const daysInRange = getDaysInRange(rangeValue);
  const daysByMonth = chunkDaysByMonth(daysInRange);


  return (
    <div className="horizontal-calendar-grid">
      {daysByMonth.map(x => {
        const { month, year } = x[0];
        // Plain english month name
        const plainEnglishMonth = getMonth(month);

        return (<div className="month-column">
          <div className="month-header">{`${plainEnglishMonth} ${year}`}</div>
          <table>
            <tbody className="horizontal-calendar-grid-body">
              <tr>
                {x.map((d: DayData) =>
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
        </div>)
      })
      }
    </div>);
}
