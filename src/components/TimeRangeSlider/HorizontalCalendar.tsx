import "./horizontalCalendar.css";
import { DateTime, Match, pipe } from "effect";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import { useEffect, useMemo, useRef, useState } from "react";
import { type PrimaryRange, type SubRange, Theme as AppTheme, TimeDuration } from "./timeSliderTypes";
import type { RangeValue } from "@react-types/shared";
import type { SxProps, Theme } from "@mui/material";
import { match, P } from "ts-pattern";
import { useTimeZoneDisplay } from '../../contexts/TimeZoneDisplayContext';

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
const createStepsOverRange = (start: number, end: number, step: number, toDisplay: (dt: DateTime.DateTime) => DateTime.DateTime): Step[] => {
  const steps: Step[] = [];
  for (let i = start; i <= end; i += step) {
    const dt = DateTime.unsafeFromDate(new Date(i));
    const displayDt = toDisplay(dt);
    const minutes = DateTime.getPart(displayDt, "minutes");
    const label = minutes === 0
      ? <div className="hour-marks">{DateTime.getPart(displayDt, "hours").toString()}</div>
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
  primaryRange,
  subRange,
  viewRange,
  latestValidDateTime,
  increment,
  theme = AppTheme.Light,
}: {
  primaryRange: PrimaryRange<DateTime.DateTime>,
  subRange?: SubRange<DateTime.DateTime>,
  viewRange: RangeValue<DateTime.DateTime>,
  latestValidDateTime?: DateTime.DateTime,
  increment?: number,
  theme?: AppTheme,
}) => {
  const { toDisplay, fromDisplay, mode } = useTimeZoneDisplay();

  // Convert all DateTimes to display timezone
  const displayPrimaryRange = useMemo(() => ({
    start: toDisplay(primaryRange.start),
    end: toDisplay(primaryRange.end)
  }), [primaryRange.start, primaryRange.end, toDisplay]);

  const displaySubRange = useMemo(() => 
    subRange ? {
      start: toDisplay(subRange.start),
      end: toDisplay(subRange.end),
      active: subRange.active
    } : undefined
  , [subRange, toDisplay]);

  const displayViewRange = useMemo(() => ({
    start: toDisplay(viewRange.start),
    end: toDisplay(viewRange.end)
  }), [viewRange.start, viewRange.end, toDisplay]);

  const displayLatestValidDateTime = useMemo(() => 
    latestValidDateTime ? toDisplay(latestValidDateTime) : undefined
  , [latestValidDateTime, toDisplay]);

  const primaryRangeMillis = useMemo(() => ([
    DateTime.toEpochMillis(displayPrimaryRange.start),
    DateTime.toEpochMillis(displayPrimaryRange.end)
  ]), [displayPrimaryRange.start, displayPrimaryRange.end]);

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
    start: DateTime.toEpochMillis(displayViewRange.start),
    end: DateTime.toEpochMillis(displayViewRange.end),
    stepArr: createStepsOverRange(
      DateTime.toEpochMillis(displayViewRange.start),
      DateTime.toEpochMillis(displayViewRange.end),
      increment || 10 * 60 * 1000,
      toDisplay
    )
  });

  useEffect(() => {
    setViewRangeAndStep({
      start: DateTime.toEpochMillis(displayViewRange.start),
      end: DateTime.toEpochMillis(displayViewRange.end),
      stepArr: createStepsOverRange(
        DateTime.toEpochMillis(displayViewRange.start),
        DateTime.toEpochMillis(displayViewRange.end),
        increment || 10 * 60 * 1000,
        toDisplay
      )
    });
  }, [displayViewRange, increment, toDisplay]);

  /**
   * Selected date range settings and slider active updates
   */

  const [sliderActive, setSliderActive] = useState<SliderActive>(SliderActive.Active);

  useEffect(() => {
    const startWithinView = DateTime.between(displayPrimaryRange.start, {
      minimum: displayViewRange.start,
      maximum: displayViewRange.end
    });
    const endWithinView = DateTime.between(displayPrimaryRange.end, {
      minimum: displayViewRange.start,
      maximum: displayViewRange.end
    });
    match([startWithinView, endWithinView])
      .with([true, true], () => {
        setSliderActive(SliderActive.Active)
      })
      .with([true, false], () => {
        setSliderActive(SliderActive.LeftActive)
      })
      .with([false, true], () => {
        setSliderActive(SliderActive.RightActive)
      })
      .with([false, false], () => {
        setSliderActive(SliderActive.Inactive)
      })
      .exhaustive();
  }, [displayViewRange, displayPrimaryRange]);

  const [sliderSubRanges, setSliderSubRanges] = useState<SubRange<number>[]>([] as SubRange<number>[]);
  useEffect(() => {
    if (!displaySubRange) {
      setSliderSubRanges([]);
      return;
    }
    setSliderSubRanges([displaySubRange].map((r) => ({
      start: DateTime.toEpochMillis(r.start),
      end: DateTime.toEpochMillis(r.end),
      active: r.active
    })));
  }, [displaySubRange]);

  const [sliderSx, setSliderSx] = useState<SxProps<Theme>>({});
  useEffect(() => {
    const selectionStart = primaryRangeMillis[0];
    const selectionEnd = primaryRangeMillis[1];
    const gradient = sliderSubRanges.reduce((acc: string, { start, end, active }: SubRange<number>) => {
      const linearGradientStart = (start - selectionStart) / (selectionEnd - selectionStart) * 100;
      const linearGradientEnd = (end - selectionStart) / (selectionEnd - selectionStart) * 100;
      if (active) {
        acc = `${acc}, transparent ${linearGradientStart}%, red ${linearGradientStart}% ${linearGradientEnd}%`;
      }
      return acc;
    }, "linear-gradient(to right");

    setSliderSx({
      '& .MuiSlider-track': {
        background: gradient.includes('red') ? gradient : colors.select,
      },
      '& .MuiSlider-rail': {
        cursor: 'pointer',
        backgroundColor: `${colors.primary} !important`,
        opacity: '1 !important',
      },
      '&.MuiSlider-root .MuiSlider-rail': {
        backgroundColor: `${colors.primary} !important`,
        opacity: '1 !important',
      },
      '& .MuiSlider-mark': {
        backgroundColor: `${colors.text} !important`,
        opacity: '1 !important',
      },
      '& .MuiSlider-markLabel': {
        color: `${colors.text} !important`,
        opacity: '1 !important',
      }
    });
  }, [sliderSubRanges, theme, colors.select, colors.primary, colors.text, primaryRangeMillis]);

  const viewInMinIncrements = [];
  for (let date = displayViewRange.start;
    DateTime.lessThanOrEqualTo(date, displayViewRange.end);
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
  const lastEvtTypeRef = useRef<string>('')

  return (
    <div className={`horizontal-calendar-grid`}>
      <div>
        <div className="horizontal-calendar-grid-header">
          <div style={{ left: headerGridLocation }} className="horizontal-calendar-grid-header-label">
            {`${getMonth(DateTime.getPart(displayViewRange.end, "month"))} ` +
              `${DateTime.getPart(displayViewRange.end, "day")}, ` +
              `${DateTime.getPart(displayViewRange.end, "year")}`}
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
          sx={sliderSx}
          getAriaLabel={() => 'Minimum distance'}
          value={primaryRangeMillis}
          onChange={(e, _newValue, activeThumb) => {
            if (!(Array.isArray(_newValue) && _newValue.length === 2)) {
              return;
            }
            // Default to 5 minutes
            const incrementMs = increment || 5 * 60 * 1000;

            /**
             * Maintain a minimum distance between thumbs
             */
            let [a, b] = _newValue as [number, number];
            let newValue = match(activeThumb)
              .with(0, () => (b - a) <= incrementMs,
                () => [b - incrementMs, b] as [number, number])
              .with(1, () => (b - a) <= incrementMs,
                () => [a, a + incrementMs])
              .otherwise(() => _newValue as [number, number]);

            /**
             * Enforce latest valid date time if set
             */
            [a, b] = newValue;
            const ldt = displayLatestValidDateTime
              ? DateTime.toEpochMillis(displayLatestValidDateTime)
              : -1;
            const maxNew = Math.max(...(newValue as [number, number]));
            newValue = match(ldt)
              .with(-1, () => newValue)
              .with(P._,
                (x) => maxNew > x,
                (x) => ([x - incrementMs, x] as [number, number]))
              .otherwise(() => newValue)

            /**
             * Set up conditions that determine if this is mousemove
             * continuation or if it's within current range click
             */
            const paddedCurrentRange = [primaryRangeMillis[0] - incrementMs, primaryRangeMillis[1] + incrementMs];
            const [currentRangeStart, currentRangeEnd] = paddedCurrentRange;
            const [newRangeStart, newRangeEnd] = newValue as [number, number];
            const currentClickValue = activeThumb === 0 ? newRangeStart : newRangeEnd;
            const currentClickIsWithinRange =
              currentRangeStart <= currentClickValue && currentClickValue <= currentRangeEnd;
            const prevEvtType = lastEvtTypeRef.current;
            const partOfMouseMoveStream = prevEvtType === 'mousemove' && e.type === 'mousemove';
            const isWithinOrMouseMove = currentClickIsWithinRange || partOfMouseMoveStream;
            lastEvtTypeRef.current = e.type;

            /**
             * New values are either adjusting thumbs' range or a click
             * that moves the entire range
             */
            const [newStart, newEnd] = match(isWithinOrMouseMove)
              .with(true, () => newValue as [number, number])
              .with(false, () => {
                // Side-effect, set slider active
                if (sliderActive === SliderActive.Inactive)
                  setSliderActive(SliderActive.Active);
                // Bump range up to start at current click position
                const duration = primaryRangeMillis[1] - primaryRangeMillis[0];
                const newStart = activeThumb === 0
                  ? (newValue as [number, number])[0]
                  : (newValue as [number, number])[1];
                const newEnd = newStart + duration;
                return [newStart, newEnd] as [number, number];
              })
              .exhaustive();

            /**
             * Dynamic rounding fn based on increment used below
             */
            const roundToIncrement = (value: number) => {
              const baseTime = DateTime.toEpochMillis(displayViewRange.start);
              const offsetFromBase = value - baseTime;
              const roundedOffset = Math.round(offsetFromBase / incrementMs) * incrementMs;
              return baseTime + roundedOffset;
            };

            /**
             * Convert back to UTC for storage
             */
            const start = pipe(
              newStart,
              roundToIncrement,
              x => DateTime.unsafeFromDate(new Date(x)),
              fromDisplay
            );
            const end = pipe(
              newEnd,
              roundToIncrement,
              x => DateTime.unsafeFromDate(new Date(x)),
              fromDisplay
            );
            primaryRange.set({ start, end });
          }}
          valueLabelDisplay="off"
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
              const dataIndex = thumbProps?.['data-index'];

              return {
                'data-index': dataIndex,
                style: {
                  width: '12px',
                  height: '24px',
                  borderRadius: '2px',
                  backgroundColor: colors.activity,
                  border: '2px solid white',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  cursor: 'ew-resize',
                }
              };
            }
          }}
        />
      </Box>
    </div>);
}
