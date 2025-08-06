import type { RangeValue } from "@react-types/shared";
import { DateTime, Duration } from "effect";
import { useEffect, useState } from "react";

export const HorizontalDateUnit = ({
  d,
  dateTimeRange,
  duration,
  setDateTimeRange,
}: {
  d: DateTime.DateTime,
  dateTimeRange: RangeValue<DateTime.DateTime>,
  duration: Duration.Duration,
  setDateTimeRange?: (range: RangeValue<DateTime.DateTime>) => void,
}) => {
  const { minutes, month, day, hours } = DateTime.toParts(d);

  const [isSelected, setIsSelected] = useState<boolean>(false);

  useEffect(() => {
    const { start: tStart, end: tEnd } = dateTimeRange;
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
  }, [dateTimeRange, d]);

  return (<td key={`${day}-${month}-${minutes}`}>
    <div className="date-cell-container">
      <button
        className="horizontal-day-button"
        onClick={() => {
          setDateTimeRange?.({
            start: d,
            end: DateTime.addDuration(d, duration)
          });
        }}
      >
        {
          isSelected
            ? <div className="horizontal-day-row-selected">
              <div className="left-selected-border" />
              {minutes === 0 ? <div>{hours}</div> : <div>{" "}</div>}
              <div className="right-selected-border" />
            </div>
            : <div className={`horizontal-day-column`}>
              {minutes === 0 ? <div>{hours}</div> : <div>{" "}</div>}
            </div>
        }
      </button>
    </div>
  </td>)
}
