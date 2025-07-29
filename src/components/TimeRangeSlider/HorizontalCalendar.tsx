import "./horizontalCalendar.css";
import f from 'lodash/fp';
import type { RangeValue } from "@react-types/shared";
import { DateTime } from "effect";
import { useState } from "react";
import { match } from "ts-pattern";

type DayData = {
  dayOfWeek: string;
  dateTime: DateTime.DateTime;
}

enum RangeSelectionMode {
  RangeSelected,
  RangeInProgress,
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

const getDayData = (dateTime: DateTime.DateTime): DayData => ({
  dateTime,
  dayOfWeek: getDayOfWeek(DateTime.getPart(dateTime, "weekDay")),
});

const chunkDaysByMonth:
  (range: RangeValue<DateTime.DateTime> | null) => DayData[][] =
  f.flow([
    ({ start, end }: RangeValue<DateTime.DateTime>) => {
      const entries: DateTime.DateTime[] = [];
      for (let date = start; DateTime.lessThanOrEqualTo(date, end); date = DateTime.add(date, { days: 1 })) {
        entries.push(date);
      }
      return entries;
    },
    f.map(getDayData),
    f.groupBy(({ dateTime: d }: DayData) => `${DateTime.getPart(d, "year")}-${DateTime.getPart(d, "month") < 10 ? "0" : ""}${DateTime.getPart(d, "month")}`),
    Object.entries,
    f.sortBy(["0"]),
    f.map(([, value]: [string, DayData[]]) => value)
  ]);

export const HorizontalCalendar = ({
  viewStartDateTime, viewEndDateTime,
  selectedStartDateTime, selectedEndDateTime,
  setSelectedStartDateTime, setSelectedEndDateTime }: {
    viewStartDateTime: DateTime.DateTime
    viewEndDateTime: DateTime.DateTime
    selectedStartDateTime: DateTime.DateTime
    selectedEndDateTime: DateTime.DateTime
    setSelectedStartDateTime?: (date: DateTime.DateTime) => void
    setSelectedEndDateTime?: (date: DateTime.DateTime) => void
    resetSelectedDateTimes?: () => void
  }) => {

  const [tempDateTimeRange, setTempDateTimeRange] =
    useState<RangeValue<DateTime.DateTime>>({
      start: selectedStartDateTime,
      end: selectedEndDateTime
    });

  const daysByMonth = chunkDaysByMonth({
    start: viewStartDateTime, end: viewEndDateTime
  });

  return (
    <div
      className="horizontal-calendar-grid"
      style={{
        gridTemplateColumns:
          `${daysByMonth.map(x => x.length).join('fr ')}fr`
      }}>
      {daysByMonth.map((x => {
        const month = DateTime.getPart(x[0].dateTime, "month");
        const year = DateTime.getPart(x[0].dateTime, "year");
        const plainEnglishMonth = getMonth(month);

        return (<div className="month-column" key={`${year}-${month}`}>
          <div className="month-header">
            {x.length > 3 ? `${plainEnglishMonth} ${year}` : ""}
          </div>
          <table>
            <tbody className="horizontal-calendar-grid-body">
              <tr>
                {x.map(({ dateTime: d, dayOfWeek }: DayData) => {
                  const { day, month, year } = DateTime.toParts(d);
                  const { start: tStart, end: tEnd } = tempDateTimeRange;
                  const pStart = selectedStartDateTime;
                  const pEnd = selectedEndDateTime;
                  const rangeSelectionMode = match([tStart, tEnd, pStart, pEnd])
                    // Range selected, no new range in progress
                    .when(([tStart, tEnd, pStart, pEnd]) =>
                      DateTime.distance(tStart, pStart) === 0 &&
                      DateTime.distance(tEnd, pEnd) === 0,
                      () => RangeSelectionMode.RangeSelected)
                    .otherwise(() => RangeSelectionMode.RangeInProgress);
                  const isSelected = match(
                    [rangeSelectionMode, tStart, tEnd, pStart, pEnd, d])
                    .when(([mode, , , pStart, pEnd, d]) =>
                      mode === RangeSelectionMode.RangeSelected &&
                      DateTime.between(d, {
                        minimum: pStart,
                        maximum: pEnd
                      }), () => true)
                    .when(([mode, tStart, tEnd, , , d]) =>
                      mode === RangeSelectionMode.RangeInProgress &&
                      (DateTime.between(d, {
                        minimum: tStart,
                        maximum: tEnd
                      }) || DateTime.between(d, {
                        minimum: tEnd,
                        maximum: tStart
                      })), () => true)
                    .otherwise(() => false);

                  return (<td key={`${year}-${month}-${day}`}>
                    <button
                      className="horizontal-day-button"
                      onClick={() => {
                        match(rangeSelectionMode)
                          .with(RangeSelectionMode.RangeSelected, () => {
                            // Reset the range selection
                            setTempDateTimeRange({
                              start: d,
                              end: d
                            });
                          })
                          .with(RangeSelectionMode.RangeInProgress, () => {
                            if (setSelectedEndDateTime) {
                              setSelectedEndDateTime(d);
                            }
                            if (setSelectedStartDateTime) {
                              setSelectedStartDateTime(tempDateTimeRange.start);
                            }
                            const newRange: RangeValue<DateTime.DateTime> =
                              DateTime.lessThanOrEqualTo(tempDateTimeRange.start, d) ?
                                { start: tempDateTimeRange.start, end: d } :
                                { start: d, end: tempDateTimeRange.start };
                            setTempDateTimeRange(newRange);
                          })
                      }}
                      onMouseEnter={() => {
                        match(rangeSelectionMode)
                          .with(RangeSelectionMode.RangeInProgress, () => {
                            setTempDateTimeRange({
                              start: tempDateTimeRange.start,
                              end: d
                            });
                          })
                      }}
                    >
                      <div className={`horizontal-day-column ${isSelected ? 'horizontal-day-column-selected' : ''}`}>
                        <div>
                          {dayOfWeek}
                        </div>
                        <div>{day}</div>
                      </div>
                    </button>
                  </td>)
                }
                )}
              </tr>
            </tbody>
          </table>
        </div>);
      }))}
    </div>);
}
