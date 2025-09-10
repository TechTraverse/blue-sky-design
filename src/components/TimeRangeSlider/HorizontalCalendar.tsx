import "./horizontalCalendar.css";
import { DateTime } from "effect";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import { useEffect, useState } from "react";
import { type PrimaryRange, type SubRange } from "./timeSliderTypes";
import type { RangeValue } from "@react-types/shared";
import type { SxProps, Theme } from "@mui/material";
import { match } from "ts-pattern";

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
  const steps: Step[] = [];
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
  increment,
  primaryRange,
  viewRange,
  subRanges,
  isStepMode = false,
}: {
  increment?: number,
  primaryRange: PrimaryRange<DateTime.DateTime>,
  viewRange: RangeValue<DateTime.DateTime>,
  subRanges?: SubRange<DateTime.DateTime>[],
  isStepMode?: boolean,
}) => {

  /**
   * Slider active state
   */
  enum SliderActive {
    Active,
    Inactive,
    RightActive,
    LeftActive
  }
  const [sliderActive, setSliderActive] = useState<SliderActive>(SliderActive.Active);

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
  const [sliderSelectedDateRange, setSliderSelectedDateRange] = useState<[number, number]>([
    DateTime.toEpochMillis(primaryRange.start),
    DateTime.toEpochMillis(primaryRange.end)
  ]);
  useEffect(() => {
    const startWithinView = DateTime.between(primaryRange.start, {
      minimum: viewRange.start,
      maximum: viewRange.end
    });
    const endWithinView = DateTime.between(primaryRange.end, {
      minimum: viewRange.start,
      maximum: viewRange.end
    });
    match([startWithinView, endWithinView])
      .with([true, true], () => {
        setSliderSelectedDateRange([
          DateTime.toEpochMillis(primaryRange.start),
          DateTime.toEpochMillis(primaryRange.end)
        ]);
        setSliderActive(SliderActive.Active)
      })
      .with([true, false], () => {
        setSliderSelectedDateRange([
          DateTime.toEpochMillis(primaryRange.start),
          DateTime.toEpochMillis(viewRange.end)
        ]);
        setSliderActive(SliderActive.LeftActive)
      })
      .with([false, true], () => {
        setSliderSelectedDateRange([
          DateTime.toEpochMillis(viewRange.start),
          DateTime.toEpochMillis(primaryRange.end)
        ]);
        setSliderActive(SliderActive.RightActive)
      })
      .with([false, false], () => {
        setSliderSelectedDateRange([DateTime.toEpochMillis(viewRange.start),
        DateTime.toEpochMillis(viewRange.end)])
        setSliderActive(SliderActive.Inactive)
      })
      .exhaustive();
  }, [SliderActive.Active, SliderActive.Inactive, SliderActive.LeftActive, SliderActive.RightActive, primaryRange, viewRange]);

  const [sliderSubRanges, setSliderSubRanges] = useState<SubRange<number>[]>([] as SubRange<number>[]);
  useEffect(() => {
    if (subRanges) {
      setSliderSubRanges(subRanges.map((r) => ({
        start: DateTime.toEpochMillis(r.start),
        end: DateTime.toEpochMillis(r.end),
        set: (range: { start: number; end: number }) => {
          r.set?.({
            start: DateTime.unsafeFromDate(new Date(range.start)),
            end: DateTime.unsafeFromDate(new Date(range.end))
          });
        },
        active: r.active
      })));
    } else {
      setSliderSubRanges([]);
    }
  }, [subRanges]);

  const [sliderSx, setSliderSx] = useState<SxProps<Theme>>({});
  useEffect(() => {
    const selectionStart = sliderSelectedDateRange[0];
    const selectionEnd = sliderSelectedDateRange[1];
    const gradient = sliderSubRanges.reduce((acc: string, { start, end, active }: SubRange<number>, idx: number) => {
      const linearGradientStart = (start - selectionStart) / (selectionEnd - selectionStart) * 100;
      const linearGradientEnd = (end - selectionStart) / (selectionEnd - selectionStart) * 100;
      if (active) {
        acc = `${acc}, transparent ${linearGradientStart}%, red ${linearGradientStart}% ${linearGradientEnd}%`;
      }
      if (idx === sliderSubRanges.length - 1) {
        acc = `${acc}, transparent ${linearGradientEnd}% 100%)`;
      }
      return acc;
    }, "linear-gradient(to right");

    setSliderSx({
      '& .MuiSlider-track': {
        background: gradient,
      }
    });
  }, [sliderSelectedDateRange, sliderSubRanges, isStepMode]);

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
    ? "10px"
    : `${(dayDividerIndex / (viewInMinIncrements.length + 1)) * 100}%`;

  return (
    <div className={`horizontal-calendar-grid`}>
      <div>
        <div className="horizontal-calendar-grid-header">
          <div style={{ left: headerGridLocation }} className="horizontal-calendar-grid-header-label">
            {`${getMonth(DateTime.getPart(viewRange.end, "month"))} ` +
              `${DateTime.getPart(viewRange.end, "day")}, ` +
              `${DateTime.getPart(viewRange.end, "year")}`}
          </div>
        </div>
      </div>
      <Box sx={{ maxWidth: "100%", boxSizing: "border-box" }} className={`horizontal-calendar-grid-body ${match(sliderActive)
        .with(SliderActive.Inactive, () => "hide-slider-components")
        .with(SliderActive.RightActive, () => "hide-left-slider-component")
        .with(SliderActive.LeftActive, () => "hide-right-slider-component")
        .otherwise(() => "")
        }`}>
        <Slider
          sx={sliderSx}
          getAriaLabel={() => 'Minimum distance'}
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
              const newDateTime = oldX === newX ? newY : newX;
              const dateTimeStart = DateTime.unsafeFromDate(new Date(newDateTime));
              const dateTimeEnd = DateTime.addDuration(
                dateTimeStart, primaryRange.duration)
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
          marks={viewRangeAndStep.stepArr}
          min={viewRangeAndStep.start}
          max={viewRangeAndStep.end}
          slotProps={{
            thumb: (ownerState, thumbProps) => {
              // Access data-index from thumbProps to differentiate thumbs
              const dataIndex = thumbProps?.['data-index'];
              
              if (isStepMode) {
                // Step mode - different colors for left/right thumbs
                const isLeftThumb = dataIndex === 0;
                return {
                  style: {
                    width: '3px',
                    height: '24px',
                    borderRadius: '0px',
                    backgroundColor: isLeftThumb ? '#1976d2' : '#f44336', // Blue left, Red right
                    border: 'none',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                    cursor: 'ew-resize',
                  }
                };
              } else {
                // Animation mode - different colored triangular thumbs
                const isLeftThumb = dataIndex === 0;
                return {
                  style: {
                    width: '0px',
                    height: '0px',
                    backgroundColor: 'transparent',
                    border: '8px solid transparent',
                    borderLeft: isLeftThumb 
                      ? '12px solid #4caf50'  // Green left thumb
                      : '12px solid #ff9800', // Orange right thumb
                    borderRadius: '0px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                    cursor: 'ew-resize',
                  }
                };
              }
            }
          }}
        />
      </Box>
    </div>);
}
