import "./horizontalCalendar.css";
import { DateTime, Duration } from "effect";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
import { type PrimaryRange, type SubRange } from "./timeSliderTypes";
import type { RangeValue } from "@react-types/shared";

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
  increment,
  primaryRange,
  viewRange,
  subRanges,
}: {
  duration: Duration.Duration,
  increment?: number,
  primaryRange: PrimaryRange,
  viewRange: RangeValue<DateTime.DateTime>,
  subRanges?: SubRange[],
}) => {

  /**
   * Slider active state
   */
  const [sliderActive, setSliderActive] = useState<boolean>(true);

  /**
   * View range and step settings
   */
  const [viewRangeAndStep, setViewRangeAndStep] = useState<{
    start: number;
    end: number;
    stepArr: Step[];
  }>({
    start: DateTime.toEpochMillis(viewRange.start),
    end: DateTime.toEpochMillis(viewRange.end),
    stepArr: createStepsOverRange(
      DateTime.toEpochMillis(viewRange.start),
      DateTime.toEpochMillis(viewRange.end),
      // 10m in milliseconds
      increment || 10 * 60 * 1000)
  });
  useEffect(() => {
    setViewRangeAndStep({
      start: DateTime.toEpochMillis(viewRange.start),
      end: DateTime.toEpochMillis(viewRange.end),
      stepArr: createStepsOverRange(
        DateTime.toEpochMillis(viewRange.start),
        DateTime.toEpochMillis(viewRange.end),
        increment || 10 * 60 * 1000)
    });
  }, [viewRange, increment]);

  /**
   * Selected date range settings and slider active udpates
   */
  const [sliderSelectedDateRange, setSliderSelectedDateRange] = useState<[number, number] | [number, number, number, number]>([
    DateTime.toEpochMillis(primaryRange.start),
    DateTime.toEpochMillis(primaryRange.end)
  ]);
  useEffect(() => {
    if (DateTime.between(primaryRange.start, {
      minimum: viewRange.start,
      maximum: viewRange.end
    }) || DateTime.between(primaryRange.end, {
      minimum: viewRange.start,
      maximum: viewRange.end
    })) {
      setSliderSelectedDateRange([
        DateTime.toEpochMillis(primaryRange.start),
        DateTime.toEpochMillis(primaryRange.end)
      ]);
      setSliderActive(true);
    } else {
      setSliderSelectedDateRange([DateTime.toEpochMillis(viewRange.start),
      DateTime.toEpochMillis(viewRange.end)]);
      setSliderActive(false);
    }
  }, [primaryRange, viewRange]);

  /**
   * Slider sx conditional settings and selected date range updates
   */
  // const [sliderSx, setSliderSx] = useState<SxProps<Theme>>({});
  // useEffect(() => {
  //   if (sliderActive && animationState && sliderSelectedDateRange.length === 2) {
  //     $animationMatch({
  //       AnimationActive: ({ animationStartDateTime, animationDuration }) => {
  //         const rangeDates = sliderSelectedDateRange.slice(0, 2);
  //         const animationStart = DateTime.toEpochMillis(animationStartDateTime);
  //         const animationEnd = DateTime.toEpochMillis(
  //           DateTime.addDuration(animationStartDateTime, animationDuration));

  //         const linePercent =
  //           (rangeDates[1] - viewRangeAndStep.start) /
  //           (animationEnd - viewRangeAndStep.start) * 100;
  //         console.log("linePercent: ", linePercent);
  //         setSliderSx({
  //           '& .MuiSlider-track': {
  //             background: `linear-gradient(to right, #FF0000 ${linePercent}%, #0000FF ${linePercent}% 100%)`
  //           },
  //           '& .MuiSlider-thumb[data-index="1"]'
  //             : {
  //             height: '10px',
  //             width: '10px',
  //           },
  //           '& .MuiSlider-thumb[data-index="2"]'
  //             : {
  //             height: '10px',
  //             width: '10px',
  //           }
  //         });
  //         console.log("slider selected date range: ", sliderSelectedDateRange)
  //         setSliderSelectedDateRange([animationStart, ...rangeDates, animationEnd] as [number, number, number, number]);
  //       },
  //       AnimationInactive: () => {
  //         setSliderSx({});
  //       }
  //     })(animationState);
  //   } else if (sliderActive && !animationState) {
  //     setSliderSx({});
  //   }
  // }, [sliderActive, sliderSelectedDateRange, viewRangeAndStep.end, viewRangeAndStep.start, animationState]);


  const viewInMinIncrements = [];
  for (let date = viewRange.start;
    DateTime.lessThanOrEqualTo(date, viewRange.end);
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
            {`${getMonth(DateTime.getPart(viewRange.end, "month"))} ` +
              `${DateTime.getPart(viewRange.end, "day")}, ` +
              `${DateTime.getPart(viewRange.end, "year")}`}
          </div>
        </div>
      </div>
      <Box sx={{ maxWidth: "100%", boxSizing: "border-box" }} className={`horizontal-calendar-grid-body ${sliderActive ? "" : "hide-slider-components"}`}>
        <Slider
          // Conditional
          // sx={sliderSx}
          getAriaLabel={() => 'Minimum distance'}
          // Conditional
          value={sliderSelectedDateRange}
          onChange={(e, newValue) => {
            if (e.type === "mousemove") {
              const [start, end] = newValue as number[];
              primaryRange.set?.({
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
              primaryRange.set?.({
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
