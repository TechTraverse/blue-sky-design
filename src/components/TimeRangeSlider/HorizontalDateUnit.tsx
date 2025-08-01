import type { RangeValue } from "@react-types/shared";
import { DateTime } from "effect";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";
import { RangeSelectionMode, type RangeSelection } from "./timeSliderTypes";

const { FinalRangeSelected, RangeInProgress } = RangeSelectionMode;

export const HorizontalDateUnit = ({
  d,
  dayOfWeek,
  dateTimeRangeAndMode,
  setDateTimeRangeAndMode,
}: {
  d: DateTime.DateTime,
  dayOfWeek: string,
  dateTimeRangeAndMode: RangeSelection,
  setDateTimeRangeAndMode: (range: RangeSelection) => void,
}) => {
  const { day, month, year } = DateTime.toParts(d);

  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<RangeSelectionMode>(dateTimeRangeAndMode.mode);

  useEffect(() => {
    setSelectionMode(dateTimeRangeAndMode.mode);
  }, [dateTimeRangeAndMode.mode]);

  useEffect(() => {
    const { start: tStart, end: tEnd } = dateTimeRangeAndMode;
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
  }, [dateTimeRangeAndMode, d]);

  return (<td key={`${year}-${month}-${day}`}>
    <button
      className="horizontal-day-button"
      onClick={() => {
        match(selectionMode)
          // First range click
          .with(FinalRangeSelected, () => {
            // Reset the range selection
            setDateTimeRangeAndMode({
              mode: RangeInProgress,
              start: d,
              end: d
            });
          })
          // Second range click
          .with(RangeInProgress, () => {
            const newRange: RangeValue<DateTime.DateTime> =
              DateTime.lessThanOrEqualTo(dateTimeRangeAndMode.start, d) ?
                { start: dateTimeRangeAndMode.start, end: d } :
                { start: d, end: dateTimeRangeAndMode.start };
            setDateTimeRangeAndMode({
              mode: FinalRangeSelected,
              start: newRange.start,
              end: newRange.end
            });
          })
      }}
      onMouseEnter={() => {
        match(selectionMode)
          .with(RangeInProgress, () => {
            setDateTimeRangeAndMode({
              mode: RangeInProgress,
              start: dateTimeRangeAndMode.start,
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
