import type { RangeValue } from "@react-types/shared";
import { DateTime } from "effect";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";

enum RangeSelectionMode {
  RangeSelected,
  RangeInProgress,
}

export const HorizontalDateUnit = ({
  d,
  dayOfWeek,
  tempDateTimeRange,
  selectedDateRange,
  setTempDateTimeRange,
  setSelectedDateRange
}: {
  d: DateTime.DateTime,
  dayOfWeek: string,
  tempDateTimeRange: RangeValue<DateTime.DateTime>,
  selectedDateRange: RangeValue<DateTime.DateTime>,
  setTempDateTimeRange: (range: RangeValue<DateTime.DateTime>) => void,
  setSelectedDateRange?: (dateRange: RangeValue<DateTime.DateTime>) => void
}) => {
  const { day, month, year } = DateTime.toParts(d);
  const { start: tStart, end: tEnd } = tempDateTimeRange;
  const pStart = selectedDateRange.start;
  const pEnd = selectedDateRange.end;

  const [rangeSelectionMode, setRangeSelectionMode] =
    useState<RangeSelectionMode>(RangeSelectionMode.RangeSelected);
  const [isSelected, setIsSelected] = useState<boolean>(false);

  useEffect(() => {
    const rangeSelectionMode = match([tStart, tEnd, pStart, pEnd])
      // Range selected, no new range in progress
      .when(([tStart, tEnd, pStart, pEnd]) =>
        DateTime.distance(tStart, pStart) === 0 &&
        DateTime.distance(tEnd, pEnd) === 0,
        () => RangeSelectionMode.RangeSelected)
      .otherwise(() => RangeSelectionMode.RangeInProgress);
    setRangeSelectionMode(rangeSelectionMode);
  }, [tStart, tEnd, pStart, pEnd]);

  useEffect(() => {
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
    setIsSelected(isSelected);
  }, [rangeSelectionMode, tStart, tEnd, pStart, pEnd, d]);

  return (<td key={`${year}-${month}-${day}`}>
    <button
      className="horizontal-day-button"
      onClick={() => {
        match(rangeSelectionMode)
          // First range click
          .with(RangeSelectionMode.RangeSelected, () => {
            console.log("First range click");
            // Reset the range selection
            setTempDateTimeRange({
              start: d,
              end: d
            });
          })
          // Second range click
          .with(RangeSelectionMode.RangeInProgress, () => {
            console.log("Second range click");
            const newRange: RangeValue<DateTime.DateTime> =
              DateTime.lessThanOrEqualTo(tempDateTimeRange.start, d) ?
                { start: tempDateTimeRange.start, end: d } :
                { start: d, end: tempDateTimeRange.start };
            setTempDateTimeRange(newRange);
            setSelectedDateRange?.(newRange);
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
