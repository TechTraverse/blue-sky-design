import "./horizontalCalendar.css";
import { DateTime } from "effect";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import { useEffect, useMemo, useRef, useState } from "react";
import { type PrimaryRange, type SubRange, AnimationSpeed, Theme as AppTheme, TimeDuration, TimeZone } from "./timeSliderTypes";
import type { RangeValue } from "@react-types/shared";
import type { SxProps, Theme } from "@mui/material";
import { match, P } from "ts-pattern";

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

/**
 * Slider active state
 */
enum SliderActive {
  Active,
  Inactive,
  RightActive,
  LeftActive
}

export const HorizontalCalendar = ({
  primaryRange: _primaryRange,
  subRange: _subRange,
  viewRange: _viewRange,
  latestValidDateTime,
  timeZone,
  increment,
  theme = AppTheme.Light,
  // isStepMode = false,
  // onSetSelectedStartDateTime,
  // onSetSelectedDuration,
  // onSetAnimationStartDateTime,
  // onPauseAnimation,
  // animationPlayMode,
  // animationSpeed,
}: {
  primaryRange: PrimaryRange<DateTime.DateTime>,
  subRange?: SubRange<DateTime.DateTime>,
  viewRange: RangeValue<DateTime.DateTime>,
  latestValidDateTime?: DateTime.DateTime,
  timeZone: TimeZone,
  increment?: number,
  theme?: AppTheme,
  // isStepMode?: boolean,
  // onSetSelectedStartDateTime?: (date: DateTime.DateTime) => void,
  // onSetSelectedEndDateTime?: (date: DateTime.DateTime) => void,
  // onSetAnimationStartDateTime?: (date: DateTime.DateTime) => void,
  // onPauseAnimation?: () => void,
  // animationPlayMode?: string,
  // animationSpeed?: AnimationSpeed,
}) => {

  const zonedOffsetMillis = useMemo(() => timeZone === TimeZone.Local
    ? _primaryRange.start.pipe(
      x => DateTime.setZone(x, DateTime.zoneMakeLocal()),
      DateTime.zonedOffset
    )
    : 0, [_primaryRange.start, timeZone]);

  const primaryRange = useMemo(() => timeZone === TimeZone.Local
    ? ({
      start: DateTime.add(_primaryRange.start, { millis: zonedOffsetMillis }),
      end: DateTime.add(_primaryRange.end, { millis: zonedOffsetMillis })
    })
    : _primaryRange, [_primaryRange, timeZone, zonedOffsetMillis]);
  const { set: setPrimaryRange } = _primaryRange;

  const subRange = useMemo(() => timeZone === TimeZone.Local && _subRange
    ? [_subRange].map(r => ({
      ...r,
      start: DateTime.add(r.start, { millis: zonedOffsetMillis }),
      end: DateTime.add(r.end, { millis: zonedOffsetMillis })
    }))[0]
    : _subRange, [_subRange, timeZone, zonedOffsetMillis]);


  const viewRange = useMemo(() => timeZone === TimeZone.Local
    ? ({
      start: DateTime.add(_viewRange.start, { millis: zonedOffsetMillis }),
      end: DateTime.add(_viewRange.end, { millis: zonedOffsetMillis })
    })
    : _viewRange, [_viewRange, timeZone, zonedOffsetMillis]);

  // Theme-aware colors that align with wlfs-client palette
  const getThemeColors = (currentTheme: AppTheme) => {
    if (currentTheme === AppTheme.Dark) {
      return {
        primary: '#1e3a5f',        // darker blue for primary selections
        select: '#4a9eff',         // brighter blue for active selections
        activity: '#22c55e',       // activity green
        compBg: '#1f2937',         // component background
        inactiveBg: '#374151',     // inactive background
        inactiveText: '#9ca3af',   // muted text
        text: '#f9fafb',           // main text
      };
    } else {
      return {
        primary: '#cce4f4',        // light blue
        select: '#0076d6',         // primary blue
        activity: '#368040ff',       // activity green
        compBg: '#f1f3f6',         // component background
        inactiveBg: '#e6e6e6',     // inactive background
        inactiveText: '#adadad',   // muted text
        text: '#3d4551',           // main text
      };
    }
  };

  const colors = getThemeColors(theme);


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
  }, [viewRange, increment, timeZone]);

  /**
   * Selected date range settings and slider active udpates
   */

  const [sliderActive, setSliderActive] = useState<SliderActive>(SliderActive.Active);

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
  }, [primaryRange, viewRange]);

  // const [sliderSubRanges, setSliderSubRanges] = useState<SubRange<number>[]>([] as SubRange<number>[]);
  // useEffect(() => {
  //   if (!subRange) {
  //     setSliderSubRanges([]);
  //     return;
  //   }
  //   setSliderSubRanges([subRange].map((r) => ({
  //     start: DateTime.toEpochMillis(r.start),
  //     end: DateTime.toEpochMillis(r.end),
  //     set: (range: { start: number; end: number }) => {
  //       r.set?.({
  //         start: DateTime.unsafeFromDate(new Date(range.start)),
  //         end: DateTime.unsafeFromDate(new Date(range.end))
  //       });
  //     },
  //     active: r.active
  //   })));
  // }, [subRange]);

  // const [sliderSx, setSliderSx] = useState<SxProps<Theme>>({});
  // useEffect(() => {
  //   const selectionStart = sliderSelectedDateRange[0];
  //   const selectionEnd = sliderSelectedDateRange[1];
  //   const gradient = [subRange].reduce((acc: string, { start, end, active }: SubRange<number> /*, idx: number */) => {
  //     const linearGradientStart = (start - selectionStart) / (selectionEnd - selectionStart) * 100;
  //     const linearGradientEnd = (end - selectionStart) / (selectionEnd - selectionStart) * 100;
  //     if (active) {
  //       acc = `${acc}, transparent ${linearGradientStart}%, red ${linearGradientStart}% ${linearGradientEnd}%`;
  //     }
  //     // if (idx === sliderSubRanges.length - 1) {
  //     //   acc = `${acc}, transparent ${linearGradientEnd}% 100%)`;
  //     // }
  //     return acc;
  //   }, "linear-gradient(to right");

  //   setSliderSx({
  //     '& .MuiSlider-track': {
  //       background: gradient.includes('red') ? gradient : colors.select,
  //     },
  //     '& .MuiSlider-rail': {
  //       cursor: 'pointer',
  //       backgroundColor: `${colors.primary} !important`,
  //       opacity: '1 !important',
  //     },
  //     '&.MuiSlider-root .MuiSlider-rail': {
  //       backgroundColor: `${colors.primary} !important`,
  //       opacity: '1 !important',
  //     },
  //     '& .MuiSlider-mark': {
  //       backgroundColor: `${colors.text} !important`,
  //       opacity: '1 !important',
  //     },
  //     '& .MuiSlider-markLabel': {
  //       color: `${colors.text} !important`,
  //       opacity: '1 !important',
  //     }
  //   });
  // }, [sliderSelectedDateRange, theme, colors.select, colors.primary, colors.text]);

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

  const sliderRef = useRef<HTMLDivElement>(null);

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
      <Box ref={sliderRef} sx={{ maxWidth: "100%", boxSizing: "border-box" }} className={`horizontal-calendar-grid-body ${match(sliderActive)
        .with(SliderActive.Inactive, () => "hide-slider-components")
        .with(SliderActive.RightActive, () => "hide-left-slider-component")
        .with(SliderActive.LeftActive, () => "hide-right-slider-component")
        .otherwise(() => "")
        }`}>
        <Slider
          // sx={sliderSx}
          getAriaLabel={() => 'Minimum distance'}
          value={sliderSelectedDateRange}
          onChange={(e, newValue, activeThumb) => {
            console.log("Active Thumb:", activeThumb);
            console.log("Slider Change Event:", e.type);
            const offsetValues = match(newValue)
              .with([P.number, P.number], (x) => x.map(v => v - zonedOffsetMillis) as [number, number])
              .otherwise(() => undefined);
            console.log("Offset Values:", offsetValues);
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            offsetValues && setPrimaryRange({
              start: DateTime.unsafeFromDate(new Date(offsetValues[0])),
              end: DateTime.unsafeFromDate(new Date(offsetValues[1]))
            });

            // match([offsetValues, e.type])
            // .with([[
            //   P.when((x: number) => {
            //     // The lower thumb value is within "increment" of the previous value
            //     return Math.abs(x - DateTime.toEpochMillis(primaryRange.start)) <= (increment || 10 * 60 * 1000);
            //   }),
            //   P.number
            // ], "mousemove"], ([[start, end]]) => {
            //   onSetSelectedStartDateTime?.(DateTime.unsafeFromDate(new Date(start)));
            //   onSetSelectedDuration?.(DateTime.distanceDuration(
            //     DateTime.unsafeFromDate(new Date(start)),
            //     DateTime.unsafeFromDate(new Date(end))
            //   ));
            // })
            // .with([[P.number, P.number], P.any], ([[start]]) => {
            //   onSetSelectedStartDateTime?.
            //     (DateTime.unsafeFromDate(new Date(start)));
            // })
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
        // slotProps={{
        //   thumb: (ownerState, thumbProps) => {
        //     // Access data-index from thumbProps to differentiate thumbs
        //     const dataIndex = thumbProps?.['data-index'];

        //     if (isStepMode) {
        //       // Step mode - different colors for left/right thumbs
        //       const isLeftThumb = dataIndex === 0;
        //       return {
        //         'data-index': dataIndex,
        //         style: {
        //           width: '3px',
        //           height: '24px',
        //           borderRadius: '0px',
        //           backgroundColor: isLeftThumb ? colors.select : '#f44336', // Primary blue left, red right
        //           border: 'none',
        //           boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        //           cursor: 'ew-resize',
        //         }
        //       };
        //     } else {
        //       // Animation mode - activity color for both thumbs
        //       return {
        //         'data-index': dataIndex,
        //         style: {
        //           width: '3px',
        //           height: '24px',
        //           borderRadius: '0px',
        //           backgroundColor: colors.activity, // Theme-aware activity color
        //           border: 'none',
        //           boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        //           cursor: 'ew-resize',
        //         }
        //       };
        //     }
        //   }
        // }}
        />
      </Box>
    </div>);
}
