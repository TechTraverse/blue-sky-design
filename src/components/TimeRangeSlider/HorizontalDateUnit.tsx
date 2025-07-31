import type { RangeValue } from "@react-types/shared";
import { DateTime } from "effect";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";
import { RangeSelectionMode } from "./timeSliderTypes";

const { RangeSelected, RangeInProgress } = RangeSelectionMode;

export const HorizontalDateUnit = ({
  d,
  dayOfWeek,
  tempDateTimeRange,
  rangeSelectionMode,
  setRangeSelectionMode,
  setTempDateTimeRange,
  setSelectedDateRange
}: {
  d: DateTime.DateTime,
  dayOfWeek: string,
  tempDateTimeRange: RangeValue<DateTime.DateTime>,
  rangeSelectionMode: RangeSelectionMode,
  setRangeSelectionMode: (mode: RangeSelectionMode) => void,
  setTempDateTimeRange: (range: RangeValue<DateTime.DateTime>) => void,
  setSelectedDateRange?: (dateRange: RangeValue<DateTime.DateTime>) => void
}) => {
  const { day, month, year } = DateTime.toParts(d);

  const [isSelected, setIsSelected] = useState<boolean>(false);

  useEffect(() => {
    const { start: tStart, end: tEnd } = tempDateTimeRange;
    const isSelected =
      DateTime.between(d, {
        minimum: tStart,
        maximum: tEnd
      }) ||
      DateTime.between(d, {
        minimum: tEnd,
        maximum: tStart
      });
    setIsSelected(isSelected);
  }, [tempDateTimeRange, d]);

  return (<td key={`${year}-${month}-${day}`}>
    <button
      className="horizontal-day-button"
      onClick={() => {
        match(rangeSelectionMode)
          // First range click
          .with(RangeSelected, () => {
            // Reset the range selection
            setRangeSelectionMode(RangeInProgress);
            setTempDateTimeRange({
              start: d,
              end: d
            });
          })
          // Second range click
          .with(RangeInProgress, () => {
            const newRange: RangeValue<DateTime.DateTime> =
              DateTime.lessThanOrEqualTo(tempDateTimeRange.start, d) ?
                { start: tempDateTimeRange.start, end: d } :
                { start: d, end: tempDateTimeRange.start };
            setTempDateTimeRange(newRange);
            setSelectedDateRange?.(newRange);
            setRangeSelectionMode(RangeSelected);
          })
      }}
      onMouseEnter={() => {
        match(rangeSelectionMode)
          .with(RangeInProgress, () => {
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
