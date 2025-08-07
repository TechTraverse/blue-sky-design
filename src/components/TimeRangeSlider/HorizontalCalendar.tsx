import "./horizontalCalendar.css";
import type { RangeValue } from "@react-types/shared";
import { DateTime, Duration } from "effect";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";

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

type Step = {
  label: React.ReactNode
  value: number;
}
const createStepsOverRange = (start: number, end: number, step: number): Step[] => {
  const steps: { label: string, value: number }[] = [];
  for (let i = start; i <= end; i += step) {
    const minutes = DateTime.getPart(DateTime.unsafeFromDate(new Date(i)), "minutes");
    const label = minutes === 0
      ? <div className="hour-marks">{DateTime.getPart(DateTime.unsafeFromDate(new Date(i)), "hours").toString()}</div>
      : minutes % 10 === 0
        ? <div className="minute-marks">{minutes.toString()}</div>
        : <div className="blank-marks" />;

    steps.push({
      value: i,
      label
    });
  }
  return steps;
}

export const HorizontalCalendar = ({
  duration, viewStartDateTime, viewEndDateTime, increment,
  selectedDateRange,
  setSelectedDateRange }: {
    duration: Duration.Duration,
    viewStartDateTime: DateTime.DateTime
    viewEndDateTime: DateTime.DateTime
    increment?: number,
    selectedDateRange: RangeValue<DateTime.DateTime>
    setSelectedDateRange?: (dateRange: RangeValue<DateTime.DateTime>) => void
    resetSelectedDateTimes?: () => void
  }) => {

  /**
   * View range and step settings
   */
  const [viewRangeAndStep, setViewRangeAndStep] = useState<{
    start: number;
    end: number;
    stepArr: Step[];
  }>({
    start: DateTime.toEpochMillis(viewStartDateTime),
    end: DateTime.toEpochMillis(viewEndDateTime),
    stepArr: createStepsOverRange(
      DateTime.toEpochMillis(viewStartDateTime),
      DateTime.toEpochMillis(viewEndDateTime),
      // 10m in milliseconds
      increment || 10 * 60 * 1000)
  });
  useEffect(() => {
    setViewRangeAndStep({
      start: DateTime.toEpochMillis(viewStartDateTime),
      end: DateTime.toEpochMillis(viewEndDateTime),
      stepArr: createStepsOverRange(
        DateTime.toEpochMillis(viewStartDateTime),
        DateTime.toEpochMillis(viewEndDateTime),
        increment || 10 * 60 * 1000)
    });
  }, [viewStartDateTime, viewEndDateTime]);

  /**
   * Selected date range settings
   */
  const [sliderActive, setSliderActive] = useState<boolean>(true);
  const [sliderSelectedDateRange, setSliderSelectedDateRange] = useState<[number, number] | []>([
    DateTime.toEpochMillis(selectedDateRange.start),
    DateTime.toEpochMillis(selectedDateRange.end)
  ]);
  useEffect(() => {
    if (DateTime.between(selectedDateRange.start, {
      minimum: viewStartDateTime,
      maximum: viewEndDateTime
    }) || DateTime.between(selectedDateRange.end, {
      minimum: viewStartDateTime,
      maximum: viewEndDateTime
    })) {
      setSliderSelectedDateRange([
        DateTime.toEpochMillis(selectedDateRange.start),
        DateTime.toEpochMillis(selectedDateRange.end)
      ]);
      setSliderActive(true);
    } else {
      setSliderSelectedDateRange([DateTime.toEpochMillis(viewStartDateTime),
      DateTime.toEpochMillis(viewEndDateTime)]);
      setSliderActive(false);
    }
  }, [selectedDateRange, viewStartDateTime, viewEndDateTime]);



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
    <div className={`horizontal-calendar-grid`}>
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
      <Box sx={{ maxWidth: "100%", boxSizing: "border-box" }} className={`horizontal-calendar-grid-body ${sliderActive ? "" : "hide-slider-components"}`}>
        <Slider
          getAriaLabel={() => 'Minimum distance'}
          value={sliderSelectedDateRange}
          onChange={(__, newValue) => {
            if (sliderActive) {
              console.log("Slider value changed:", newValue);
              const [start, end] = newValue as number[];
              setSelectedDateRange?.({
                start: DateTime.unsafeFromDate(new Date(start)),
                end: DateTime.unsafeFromDate(new Date(end))
              });
            } else {
              const [oldX] = sliderSelectedDateRange;
              const [newX, newY] = newValue;
              const newDateTime = oldX === newX ? newY : newX;
              const dateTimeStart = DateTime.unsafeFromDate(new Date(newDateTime));
              const dateTimeEnd = DateTime.addDuration(
                dateTimeStart, duration)
              setSelectedDateRange?.({
                start: dateTimeStart,
                end: dateTimeEnd
              });
            }
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => {
            const date = DateTime.unsafeFromDate(new Date(value));
            return DateTime.formatIsoDate(date);
          }}
          step={null}
          // getAriaValueText={valuetext}
          marks={viewRangeAndStep.stepArr}
          min={viewRangeAndStep.start}
          max={viewRangeAndStep.end}
        />
      </Box>
    </div>);
}
