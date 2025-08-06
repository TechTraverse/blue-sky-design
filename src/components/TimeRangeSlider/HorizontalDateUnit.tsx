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
  const [leftDurationChangeActive, setLeftDurationChangeActive] = useState<boolean>(false);
  const [rightDurationChangeActive, setRightDurationChangeActive] = useState<boolean>(false);

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
              <div className={`left-selected-border ${leftDurationChangeActive ? "left-duration-active" : ""}`}
                onMouseEnter={() => setLeftDurationChangeActive(true)}
                onMouseLeave={() => setLeftDurationChangeActive(false)}
              />
              <div className="cell-content-grid">
                <div className="blank-cell-space" />
                {minutes === 0
                  ? <div className="cell-content">{hours}</div>
                  : <div className="cell-content">{" "}</div>}
                <div className="blank-cell-space" />
              </div>
              <div className={`right-selected-border ${rightDurationChangeActive ? "right-duration-active" : ""}`}
                onMouseEnter={() => setRightDurationChangeActive(true)}
                onMouseLeave={() => setRightDurationChangeActive(false)}
              />
            </div>
            : <div>
              <div className="left-unselected-border" />
              <div className="cell-content-grid">
                <div className="blank-cell-space" />
                {minutes === 0
                  ? <div className="cell-content">{hours}</div>
                  : <div className="cell-content">{" "}</div>}
                <div className="blank-cell-space" />
              </div>
              <div className="right-unselected-border" />
            </div>
        }
      </button>
    </div>
  </td>)
}
