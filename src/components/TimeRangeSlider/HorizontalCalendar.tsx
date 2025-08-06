import "./horizontalCalendar.css";
import f from 'lodash/fp';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Duration } from "effect";
import { HorizontalDateUnit } from "./HorizontalDateUnit";

type DayData = {
  dayOfWeek: string;
  dateTime: DateTime.DateTime;
}

const getDayOfWeek = (weekDay: number): string => {
  switch (weekDay) {
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

export const HorizontalCalendar = ({
  duration, viewStartDateTime, viewEndDateTime,
  selectedDateRange,
  setSelectedDateRange }: {
    duration: Duration.Duration,
    viewStartDateTime: DateTime.DateTime
    viewEndDateTime: DateTime.DateTime
    selectedDateRange: RangeValue<DateTime.DateTime>
    setSelectedDateRange?: (dateRange: RangeValue<DateTime.DateTime>) => void
    resetSelectedDateTimes?: () => void
  }) => {

  const viewInMinIncrements = [];
  for (let date = viewStartDateTime;
    DateTime.lessThanOrEqualTo(date, viewEndDateTime);
    date = DateTime.add(date, { minutes: 10 })) {
    viewInMinIncrements.push(date);
  }

  const dayDividerIndex = viewInMinIncrements.findIndex(
    (d: DateTime.DateTime) => DateTime.getPart(d, "hours") === 0 &&
      DateTime.getPart(d, "minutes") === 10);
  const headerGridLocation = dayDividerIndex === -1
    ? "1 / 4"
    : `${dayDividerIndex} / ${dayDividerIndex + 4}`;

  return (
    <div className="horizontal-calendar-grid">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            `${viewInMinIncrements.map(() => 1).join('fr ')}fr`
        }}
      >
        <div style={{ gridColumn: headerGridLocation }} className="horizontal-calendar-grid-header">
          <div className="horizontal-calendar-grid-header-label">
            {`${getMonth(DateTime.getPart(viewEndDateTime, "month"))} ` +
              `${DateTime.getPart(viewEndDateTime, "day")}, ` +
              `${DateTime.getPart(viewEndDateTime, "year")}`}
          </div>
        </div>
      </div>

      <table>
        <tbody className="horizontal-calendar-grid-body">
          <tr>
            {viewInMinIncrements.map((x: DateTime.DateTime) =>
              <HorizontalDateUnit
                duration={duration}
                key={DateTime.formatIso(x)}
                d={x}
                dateTimeRange={selectedDateRange}
                setDateTimeRange={setSelectedDateRange}
              />
            )}
          </tr>
        </tbody>
      </table>
    </div>);
}
