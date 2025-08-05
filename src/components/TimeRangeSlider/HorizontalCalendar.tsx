import "./horizontalCalendar.css";
import f from 'lodash/fp';
import type { RangeValue } from "@react-types/shared";
import { DateTime } from "effect";
import { useEffect, useState } from "react";
import { HorizontalDateUnit } from "./HorizontalDateUnit";
import { RangeSelectionMode, type RangeSelection } from "./timeSliderTypes";
import { match } from "ts-pattern";

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
  selectedDateRange,
  setSelectedDateRange }: {
    viewStartDateTime: DateTime.DateTime
    viewEndDateTime: DateTime.DateTime
    selectedDateRange: RangeValue<DateTime.DateTime>
    setSelectedDateRange?: (dateRange: RangeValue<DateTime.DateTime>) => void
    resetSelectedDateTimes?: () => void
  }) => {

  /**
   * Temporary range and mode for the calendar.
   */

  const [tempRangeAndMode, _setTempRangeAndMode] =
    useState<RangeSelection>({
      mode: RangeSelectionMode.FinalRangeSelected,
      start: selectedDateRange.start,
      end: selectedDateRange.end
    });
  const setTempRangeAndMode = (r: RangeSelection) => {
    match(r)
      .with({ mode: RangeSelectionMode.FinalRangeSelected },
        ({ start, end }) => setSelectedDateRange?.({ start, end }))
    _setTempRangeAndMode(r);
  }
  useEffect(() => {
    _setTempRangeAndMode({
      mode: RangeSelectionMode.FinalRangeSelected,
      start: selectedDateRange.start,
      end: selectedDateRange.end
    });
  }, [selectedDateRange.start, selectedDateRange.end]);

  const daysByMonth = chunkDaysByMonth({
    start: viewStartDateTime, end: viewEndDateTime
  });
  // console.log(DateTime.formatIsoDate(viewStartDateTime), DateTime.formatIsoDate(viewEndDateTime));
  const viewInMinIncrements = [];
  for (let date = viewStartDateTime;
    DateTime.lessThanOrEqualTo(date, viewEndDateTime);
    date = DateTime.add(date, { minutes: 10 })) {
    viewInMinIncrements.push(date);
  }

  return (
    <div
      className="horizontal-calendar-grid"
    // style={{
    //   gridTemplateColumns:
    //     `${daysByMonth.map(x => x.length).join('fr ')}fr`
    // }}
    >
      <table>
        <tbody className="horizontal-calendar-grid-body">
          <tr>
            {viewInMinIncrements.map((x: DateTime.DateTime) =>
              <HorizontalDateUnit
                key={DateTime.formatIso(x)}
                d={x}
                dateTimeRangeAndMode={tempRangeAndMode}
                setDateTimeRangeAndMode={setTempRangeAndMode}
              />
            )}
          </tr>
        </tbody>
      </table>
    </div>);
}
