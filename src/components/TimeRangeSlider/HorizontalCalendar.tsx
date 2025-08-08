import "./horizontalCalendar.css";
import type { RangeValue } from "@react-types/shared";
import { DateTime, Duration } from "effect";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
import { $animationMatch, AnimationActive, type AnimationState } from "./timeSliderTypes";
import type { SxProps, Theme } from "@mui/material";

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
  duration,
  viewStartDateTime,
  viewEndDateTime,
  increment,
  selectedDateRange,
  setSelectedDateRange,
  setAnimationDateRange,
  animationState,
}: {
  duration: Duration.Duration,
  viewStartDateTime: DateTime.DateTime
  viewEndDateTime: DateTime.DateTime
  increment?: number,
  selectedDateRange: RangeValue<DateTime.DateTime>
  setSelectedDateRange?: (dateRange: RangeValue<DateTime.DateTime>) => void
  setAnimationActive?: (active: boolean) => void
  setAnimationDateRange?: (dateRange: RangeValue<DateTime.DateTime>) => void
  animationState?: AnimationState
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
  }, [viewStartDateTime, viewEndDateTime, increment]);

  /**
   * Slider active state
   */
  const [sliderActive, setSliderActive] = useState<boolean>(true);

  /**
   * Selected date range settings
   */
  const [sliderSelectedDateRange, setSliderSelectedDateRange] = useState<[number, number] | [number, number, number, number]>([
    DateTime.toEpochMillis(selectedDateRange.start),
    DateTime.toEpochMillis(selectedDateRange.end)
  ]);
  useEffect(() => {
    if (animationState?._tag === "AnimationActive") {
      return;
    }

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
  }, [selectedDateRange, viewStartDateTime, viewEndDateTime, animationState]);

  // useEffect(() =>
  //   animationState && $animationMatch({
  //     AnimationActive: () => {
  //       setAnimationDateRange?.({
  //         start: DateTime.unsafeFromDate(new Date(sliderSelectedDateRange[0])),
  //         end: DateTime.unsafeFromDate(new Date(sliderSelectedDateRange[3] || sliderSelectedDateRange[1]))
  //       });
  //     },
  //     AnimationInactive: () => {
  //       if (DateTime.between(selectedDateRange.start, {
  //         minimum: viewStartDateTime,
  //         maximum: viewEndDateTime
  //       }) || DateTime.between(selectedDateRange.end, {
  //         minimum: viewStartDateTime,
  //         maximum: viewEndDateTime
  //       })) {
  //         setSliderSelectedDateRange([
  //           DateTime.toEpochMillis(selectedDateRange.start),
  //           DateTime.toEpochMillis(selectedDateRange.end)
  //         ]);
  //         setSliderActive(true);
  //       } else {
  //         setSliderSelectedDateRange([DateTime.toEpochMillis(viewStartDateTime),
  //         DateTime.toEpochMillis(viewEndDateTime)]);
  //         setSliderActive(false);
  //       }
  //     }
  //   })(animationState),
  //   [selectedDateRange, viewStartDateTime, viewEndDateTime, animationState, setAnimationDateRange, sliderSelectedDateRange]);

  /**
   * Slider sx conditional settings and selected date range updates
   */
  const [sliderSx, setSliderSx] = useState<SxProps<Theme>>({});
  useEffect(() => {
    if (sliderActive && animationState && sliderSelectedDateRange.length === 2) {
      $animationMatch({
        AnimationActive: ({ animationStartDateTime, animationDuration }) => {
          const rangeDates = sliderSelectedDateRange.slice(0, 2);
          const animationStart = DateTime.toEpochMillis(animationStartDateTime);
          const animationEnd = DateTime.toEpochMillis(
            DateTime.addDuration(animationStartDateTime, animationDuration));

          const linePercent =
            (rangeDates[1] - viewRangeAndStep.start) /
            (animationEnd - viewRangeAndStep.start) * 100;
          console.log("linePercent: ", linePercent);
          setSliderSx({
            '& .MuiSlider-track': {
              background: `linear-gradient(to right, #FF0000 ${linePercent}%, #0000FF ${linePercent}% 100%)`
            },
            '& .MuiSlider-thumb[data-index="1"]'
              : {
              height: '10px',
              width: '10px',
            },
            '& .MuiSlider-thumb[data-index="2"]'
              : {
              height: '10px',
              width: '10px',
            }
          });
          console.log("slider selected date range: ", sliderSelectedDateRange)
          setSliderSelectedDateRange([animationStart, ...rangeDates, animationEnd] as [number, number, number, number]);
        },
        AnimationInactive: () => {
          setSliderSx({});
        }
      })(animationState);
    } else if (sliderActive && !animationState) {
      setSliderSx({});
    }
  }, [sliderActive, sliderSelectedDateRange, viewRangeAndStep.end, viewRangeAndStep.start, animationState]);


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
  console.log(sliderSx, "sliderSx");

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
          // Conditional
          sx={sliderSx}
          getAriaLabel={() => 'Minimum distance'}
          // Conditional
          value={sliderSelectedDateRange}
          onChange={(e, newValue) => {
            console.log("Slider value changed", e);
            if (newValue.length === 2) {
              if (e.type === "mousemove") {
                const [start, end] = newValue as number[];
                setSelectedDateRange?.({
                  start: DateTime.unsafeFromDate(new Date(start)),
                  end: DateTime.unsafeFromDate(new Date(end))
                });
              } else {
                const [oldX] = sliderSelectedDateRange;
                const [newX, newY] = newValue;
                console.log("Percent: ", ((newX - viewRangeAndStep.start) / (viewRangeAndStep.end - viewRangeAndStep.start)) * 100);
                const newDateTime = oldX === newX ? newY : newX;
                const dateTimeStart = DateTime.unsafeFromDate(new Date(newDateTime));
                const dateTimeEnd = DateTime.addDuration(
                  dateTimeStart, duration)
                setSelectedDateRange?.({
                  start: dateTimeStart,
                  end: dateTimeEnd
                });
              }
            } else if (newValue.length === 4) {
              const [animationStart, , , animationEnd] = newValue as number[];
              setAnimationDateRange?.({
                start: DateTime.unsafeFromDate(new Date(animationStart)),
                end: DateTime.unsafeFromDate(new Date(animationEnd))
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
