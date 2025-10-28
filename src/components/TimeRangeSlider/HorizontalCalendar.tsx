import "./horizontalCalendar.css";
import { DateTime, pipe } from "effect";
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
}: {
  primaryRange: PrimaryRange<DateTime.DateTime>,
  subRange?: SubRange<DateTime.DateTime>,
  viewRange: RangeValue<DateTime.DateTime>,
  latestValidDateTime?: DateTime.DateTime,
  timeZone: TimeZone,
  increment?: number,
  theme?: AppTheme,
}) => {

  const zonedOffsetMillis = useMemo(() => timeZone === TimeZone.Local
    ? _primaryRange.start.pipe(
      x => DateTime.setZone(x, DateTime.zoneMakeLocal()),
      DateTime.zonedOffset
    )
    : 0, [_primaryRange.start, timeZone]);

  const { start: prStart, end: prEnd } = _primaryRange;
  const primaryRange = useMemo(() => timeZone === TimeZone.Local
    ? ({
      start: DateTime.add(prStart, { millis: zonedOffsetMillis }),
      end: DateTime.add(prEnd, { millis: zonedOffsetMillis })
    })
    : { start: prStart, end: prEnd }, [prStart, prEnd, timeZone, zonedOffsetMillis]);
  const { set: setPrimaryRange } = _primaryRange;
  const primaryRangeMillis = useMemo(() => ([
    primaryRange.start.pipe(DateTime.toEpochMillis),
    primaryRange.end.pipe(DateTime.toEpochMillis)
  ]), [primaryRange.start, primaryRange.end]);

  const subRange = useMemo(() =>
    timeZone === TimeZone.Local && _subRange?.start
      ? {
        start: DateTime.add(_subRange.start, { millis: zonedOffsetMillis }),
        end: DateTime.add(_subRange.end, { millis: zonedOffsetMillis }),
        active: _subRange.active
      }
      : undefined, [_subRange?.active, _subRange?.start, _subRange?.end, timeZone, zonedOffsetMillis]);


  const viewRange = useMemo(() => timeZone === TimeZone.Local
    ? ({
      start: DateTime.add(_viewRange.start, { millis: zonedOffsetMillis }),
      end: DateTime.add(_viewRange.end, { millis: zonedOffsetMillis })
    })
    : {
      start: _viewRange.start,
      end: _viewRange.end
    }, [_viewRange.start, _viewRange.end, timeZone, zonedOffsetMillis]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRange]); /* Only respond to view range changes */

  const [sliderSubRanges, setSliderSubRanges] = useState<SubRange<number>[]>([] as SubRange<number>[]);
  useEffect(() => {
    if (!subRange) {
      setSliderSubRanges([]);
      return;
    }
    setSliderSubRanges([subRange].map((r) => ({
      start: DateTime.toEpochMillis(r.start),
      end: DateTime.toEpochMillis(r.end),
      active: r.active
    })));
  }, [subRange]);

  const [sliderSx, setSliderSx] = useState<SxProps<Theme>>({});
  useEffect(() => {
    const selectionStart = primaryRangeMillis[0];
    const selectionEnd = primaryRangeMillis[1];
    const gradient = sliderSubRanges.reduce((acc: string, { start, end, active }: SubRange<number> /*, idx: number */) => {
      const linearGradientStart = (start - selectionStart) / (selectionEnd - selectionStart) * 100;
      const linearGradientEnd = (end - selectionStart) / (selectionEnd - selectionStart) * 100;
      if (active) {
        acc = `${acc}, transparent ${linearGradientStart}%, red ${linearGradientStart}% ${linearGradientEnd}%`;
      }
      // if (idx === sliderSubRanges.length - 1) {
      //   acc = `${acc}, transparent ${linearGradientEnd}% 100%)`;
      // }
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
  const lastEvtTypeRef = useRef<string>('')


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
            const [a, b] = _newValue as [number, number];
            const newValue = match(activeThumb)
              .with(0, () => (b - a) <= incrementMs,
                () => [b - incrementMs, b] as [number, number])
              .with(1, () => (b - a) <= incrementMs,
                () => [a, a + incrementMs])
              .otherwise(() => _newValue as [number, number]);

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
             * Dynamic rounding based on increment
             */
            const roundToIncrement = (value: number) => {
              const baseTime = DateTime.toEpochMillis(viewRange.start);
              const offsetFromBase = value - baseTime;
              const roundedOffset = Math.round(offsetFromBase / incrementMs) * incrementMs;
              return baseTime + roundedOffset;
            };

            /**
             * Rounded and offset-corrected start/end for primary range
             */
            const start = pipe(
              newStart,
              roundToIncrement,
              x => x - zonedOffsetMillis,
              x => new Date(x),
              DateTime.unsafeFromDate
            );
            const end = pipe(
              newEnd,
              roundToIncrement,
              x => x - zonedOffsetMillis,
              x => new Date(x),
              DateTime.unsafeFromDate
            );
            setPrimaryRange({ start, end });
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
