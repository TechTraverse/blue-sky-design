import "./horizontalCalendar.css";
import _ from "lodash";
import f from 'lodash/fp';
import type { RangeValue } from "@react-types/shared";
import { CalendarDate, getDayOfWeek as _getDayOfWeek, type DateValue } from "@internationalized/date";
import { DateTime, Duration } from "effect";

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

const chunkDaysByMonth: (d: DayData[]) => DayData[][] =
  f.flow([
    f.groupBy((d: DayData) => `${d.year}-${d.month < 10 ? "0" : ""}${d.month}`),
    Object.entries,
    f.sortBy(["0"]),
    f.map(([, value]: [string, DayData[]]) => value)
  ]);

export const HorizontalCalendar = ({
  duration, viewStartDateTime }: {
    duration: Duration.Duration,
    viewStartDateTime: DateTime.DateTime
  }) => {
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
    <div
      className="horizontal-calendar-grid"
      style={{
        gridTemplateColumns:
          `${daysByMonth.map(x => x.length).join('fr ')}fr`
      }}>
      {daysByMonth.map((x => {
        const { month, year } = x[0];
        const plainEnglishMonth = getMonth(month);

        return (<div className="month-column" key={`${year}-${month}`}>
          <div className="month-header">
            {x.length > 3 ? `${plainEnglishMonth} ${year}` : ""}
          </div>
          <table>
            <tbody className="horizontal-calendar-grid-body">
              <tr>
                {x.map((d: DayData) =>
                (<td key={`${d.year}-${d.month}-${d.day}`}>
                  <div className="horizontal-day-column">
                    <div>
                      {d.dayOfWeek}
                    </div>
                    <button className="horizontal-day-button">
                      {d.day}
                    </button>
                  </div>
                </td>))}
              </tr>
            </tbody>
          </table>
        </div>);
      }))}
    </div>);
}
