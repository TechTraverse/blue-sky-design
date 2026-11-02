import "./horizontalCalendar.css";
import { DateTime, pipe } from "effect";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import { useEffect, useMemo, useRef, useState } from "react";
import { type PrimaryRange, type LimitedRange, Theme as AppTheme } from "./timeSliderTypes";
import type { RangeValue } from "@react-types/shared";
import type { SxProps, Theme } from "@mui/material";
import { match } from "ts-pattern";
import { useTimeZoneDisplay } from '../../contexts/TimeZoneDisplayContext';
import { ceilToGrid, floorToGrid, nearestGridPoint, snapInstant } from './stepping';
import { axisLabelDensity, axisMarkKind, formatClockTime } from './timeLabels';

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
  disabled: boolean;
}
/** `from`/`to`: labels outside them would be cut off at the track's edges. */
type LabelDensity = { hourInterval: number; halfHourLabels: boolean; from?: number; to?: number };
const pad2 = (n: number) => n.toString().padStart(2, '0');

/**
 * Every mark gets a tick, longest at the hour and at midnight. Hours read as
 * "17:00", midnight as the new date ("Nov 2"), and ":30" gets a lighter label
 * when there is room; `density` thins the hour labels on narrow tracks.
 */
const createStepsOverRange = (start: number, end: number, step: number, toDisplay: (dt: DateTime.DateTime) => DateTime.DateTime, earliestValidDateTime?: DateTime.DateTime, latestValidDateTime?: DateTime.DateTime, density: LabelDensity = { hourInterval: 1, halfHourLabels: true }): Step[] => {
  const steps: Step[] = [];
  const earliestValidMillis = earliestValidDateTime ? DateTime.toEpochMillis(earliestValidDateTime) : undefined;
  const latestValidMillis = latestValidDateTime ? DateTime.toEpochMillis(latestValidDateTime) : undefined;

  for (let i = start; i <= end; i += step) {
    const dt = DateTime.unsafeFromDate(new Date(i));
    const displayDt = toDisplay(dt);
    const minutes = DateTime.getPart(displayDt, "minutes");
    const isBeforeMin = earliestValidMillis !== undefined && i < earliestValidMillis;
    const isAfterMax = latestValidMillis !== undefined && i > latestValidMillis;
    const isDisabled = isBeforeMin || isAfterMax;

    const hours = DateTime.getPart(displayDt, "hours");
    const kind = axisMarkKind(hours, minutes);
    const fits = (density.from === undefined || i >= density.from) && (density.to === undefined || i <= density.to);
    const text = !fits ? undefined : match(kind)
      .with('day', () => `${getMonth(DateTime.getPart(displayDt, "month")).slice(0, 3)} ${DateTime.getPart(displayDt, "day")}`)
      .with('hour', () => hours % density.hourInterval === 0 ? `${pad2(hours)}:00` : undefined)
      .with('half', () => density.halfHourLabels ? ':30' : undefined)
      .otherwise(() => undefined);

    const label = (
      <span className={`axis-mark axis-mark-${kind}${isDisabled ? ' disabled-marks' : ''}`}>
        <span className="axis-tick" aria-hidden="true" />
        {text && <span className="axis-label">{text}</span>}
      </span>
    );

    steps.push({
      value: i,
      label,
      disabled: isDisabled
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
  limitedRange,
  viewRange,
  earliestValidDateTime,
  latestValidDateTime,
  increment,
  instantStepMs,
  theme = AppTheme.Light,
  showDateHeader = true,
}: {
  primaryRange: PrimaryRange<DateTime.DateTime>,
  limitedRange?: LimitedRange<DateTime.DateTime>,
  viewRange: RangeValue<DateTime.DateTime>,
  earliestValidDateTime?: DateTime.DateTime,
  latestValidDateTime?: DateTime.DateTime,
  increment?: number,
  /**
   * Instant mode's grid step. The track then shows one thumb at
   * `primaryRange.start`, its marks fall on the grid, and every move snaps to it.
   */
  instantStepMs?: number,
  theme?: AppTheme,
  /** The date above the track. Instant mode drops it when the readout shows the date. */
  showDateHeader?: boolean,
}) => {
  const { toDisplay, fromDisplay, getDisplayZone } = useTimeZoneDisplay();

  // The track's width sets how densely the axis can label.
  const sliderRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setTrackWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Convert all DateTimes to display timezone
  const displayPrimaryRange = useMemo(() => ({
    start: toDisplay(primaryRange.start),
    end: toDisplay(primaryRange.end)
  }), [primaryRange.start, primaryRange.end, toDisplay]);

  const displayLimitedRange = useMemo(() =>
    limitedRange ? {
      start: toDisplay(limitedRange.start),
      end: toDisplay(limitedRange.end)
    } : undefined
    , [limitedRange, toDisplay]);

  const displayViewRange = useMemo(() => ({
    start: toDisplay(viewRange.start),
    end: toDisplay(viewRange.end)
  }), [viewRange.start, viewRange.end, toDisplay]);

  const displayEarliestValidDateTime = useMemo(() =>
    earliestValidDateTime ? toDisplay(earliestValidDateTime) : undefined
    , [earliestValidDateTime, toDisplay]);

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
        boundary: '#6b7280',       // gray boundary for disabled cutoff
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
        boundary: '#9ca3af',       // gray boundary for disabled cutoff
      };
    }
  };

  const colors = useMemo(() => getThemeColors(theme), [theme]);

  /**
   * View range and step settings. In instant mode the marks are the grid
   * points, which with `step={null}` are also where the thumb can land.
   */
  const markStepMs = instantStepMs || increment || 10 * 60 * 1000;
  const firstMarkMs = (viewStartMs: number) =>
    instantStepMs ? ceilToGrid(viewStartMs, instantStepMs) : viewStartMs;

  const [viewRangeAndStep, setViewRangeAndStep] = useState<{
    start: number;
    end: number;
    stepArr: Step[];
  }>({
    start: DateTime.toEpochMillis(displayViewRange.start),
    end: DateTime.toEpochMillis(displayViewRange.end),
    stepArr: createStepsOverRange(
      firstMarkMs(DateTime.toEpochMillis(displayViewRange.start)),
      DateTime.toEpochMillis(displayViewRange.end),
      markStepMs,
      toDisplay,
      displayEarliestValidDateTime,
      displayLatestValidDateTime
    )
  });

  // Unmeasured (first render, tests) labels every hour and half hour.
  const viewStartMs = DateTime.toEpochMillis(displayViewRange.start);
  const viewEndMs = DateTime.toEpochMillis(displayViewRange.end);
  const viewHours = (viewEndMs - viewStartMs) / 3_600_000;
  const measured = trackWidth > 0 && viewHours > 0;
  const { hourInterval, halfHourLabels } = measured
    ? axisLabelDensity(trackWidth / viewHours)
    : { hourInterval: 1, halfHourLabels: true };
  // Half an "HH:00" label's width, in time.
  const edgeMs = measured ? Math.round(20 * (viewEndMs - viewStartMs) / trackWidth) : 0;
  const labelFrom = viewStartMs + edgeMs;
  const labelTo = viewEndMs - edgeMs;

  useEffect(() => {
    setViewRangeAndStep({
      start: DateTime.toEpochMillis(displayViewRange.start),
      end: DateTime.toEpochMillis(displayViewRange.end),
      stepArr: createStepsOverRange(
        firstMarkMs(DateTime.toEpochMillis(displayViewRange.start)),
        DateTime.toEpochMillis(displayViewRange.end),
        markStepMs,
        toDisplay,
        displayEarliestValidDateTime,
        displayLatestValidDateTime,
        { hourInterval, halfHourLabels, from: labelFrom, to: labelTo }
      )
    });
    // firstMarkMs only reads instantStepMs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayViewRange, markStepMs, instantStepMs, toDisplay, displayEarliestValidDateTime, displayLatestValidDateTime, hourInterval, halfHourLabels, labelFrom, labelTo]);

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

  const [sliderSx, setSliderSx] = useState<SxProps<Theme>>({});
  useEffect(() => {
    setSliderSx({
      '& .MuiSlider-track': {
        background: colors.select,
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
      // Each mark label draws its own tick, so the length can follow the mark's kind.
      '& .MuiSlider-mark': {
        display: 'none',
      },
      '& .MuiSlider-markLabel': {
        color: `${colors.text} !important`,
        opacity: '1 !important',
      },
      // Instant mode's time label above the thumb.
      '& .MuiSlider-valueLabel': {
        top: '-4px',
        padding: '1px 7px',
        borderRadius: '4px',
        backgroundColor: theme === AppTheme.Dark ? '#4a9eff' : '#005ea2',
        color: theme === AppTheme.Dark ? '#0b1620' : '#ffffff',
        fontFamily: "'Nunito Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: '13px',
        fontWeight: 700,
        lineHeight: '18px',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: 0,
      },
      '& .MuiSlider-thumb': {
        // Above the out-of-range overlays, which now start exactly at the bound.
        zIndex: 3,
        backgroundColor: theme === AppTheme.Dark ? '#4a9eff' : '#005ea2',
        '&:hover': {
          boxShadow: theme === AppTheme.Dark ? '0 0 0 8px rgba(74, 158, 255, 0.16)' : '0 0 0 8px rgba(0, 94, 162, 0.16)',
        },
        '&.Mui-active': {
          boxShadow: theme === AppTheme.Dark ? '0 0 0 14px rgba(74, 158, 255, 0.16)' : '0 0 0 14px rgba(0, 94, 162, 0.16)',
        },
      }
    });
  }, [theme, colors.select, colors.primary, colors.text]);

  const headerGridLocation = useMemo(() => {
    const viewInMinIncrements: DateTime.DateTime[] = [];
    for (let date = displayViewRange.start;
      DateTime.lessThanOrEqualTo(date, displayViewRange.end);
      date = DateTime.add(date, { minutes: 5 })) {
      viewInMinIncrements.push(date);
    }

    const dayDividerIndex = viewInMinIncrements.findIndex(
      (d: DateTime.DateTime) => DateTime.getPart(d, "hours") === 0 &&
        DateTime.getPart(d, "minutes") === 10);
    return dayDividerIndex === -1
      ? "10px"
      : `${(dayDividerIndex / (viewInMinIncrements.length + 1)) * 100}%`;
  }, [displayViewRange.end, displayViewRange.start]);

  const lastEvtTypeRef = useRef<string>('');
  const [draggingBoundary, setDraggingBoundary] = useState<'start' | 'end' | null>(null);
  const [hoveringBoundary, setHoveringBoundary] = useState<'start' | 'end' | null>(null);
  const [hoveringDisabledRegion, setHoveringDisabledRegion] = useState<'left' | 'right' | null>(null);

  // Calculate earliestValidDateTime position for visual indicator (left-side disabled region)
  const earliestValidPosition = useMemo(() => {
    if (!displayEarliestValidDateTime) return null;

    const earliestValidMs = DateTime.toEpochMillis(displayEarliestValidDateTime);
    const viewStart = viewRangeAndStep.start;
    const viewEnd = viewRangeAndStep.end;
    const viewDuration = viewEnd - viewStart;

    // If earliestValidDateTime is before view start, no disabled region visible on left
    if (earliestValidMs <= viewStart) return null;

    // If earliestValidDateTime is after view end, entire view is disabled
    if (earliestValidMs >= viewEnd) {
      return {
        percent: 100,
        fullyCovered: true,
      };
    }

    // earliestValidDateTime falls within the visible view
    const positionPercent = ((earliestValidMs - viewStart) / viewDuration) * 100;
    return {
      percent: positionPercent,
      fullyCovered: false,
    };
  }, [displayEarliestValidDateTime, viewRangeAndStep]);

  // Calculate latestValidDateTime position for visual indicator (right-side disabled region)
  const latestValidPosition = useMemo(() => {
    if (!displayLatestValidDateTime) return null;

    const latestValidMs = DateTime.toEpochMillis(displayLatestValidDateTime);
    const viewStart = viewRangeAndStep.start;
    const viewEnd = viewRangeAndStep.end;
    const viewDuration = viewEnd - viewStart;

    // If latestValidDateTime is after view end, no disabled region visible
    if (latestValidMs >= viewEnd) return null;

    // If latestValidDateTime is before view start, entire view is disabled
    if (latestValidMs <= viewStart) {
      return {
        percent: 0,
        rightPercent: 100,
        fullyCovered: true,
      };
    }

    // latestValidDateTime falls within the visible view
    const positionPercent = ((latestValidMs - viewStart) / viewDuration) * 100;
    return {
      percent: positionPercent,
      rightPercent: 100 - positionPercent,
      fullyCovered: false,
    };
  }, [displayLatestValidDateTime, viewRangeAndStep]);

  // Calculate limited range position for visual indicators using pattern matching
  const limitedRangePosition = useMemo(() => {
    if (!displayLimitedRange) return null;

    const limitStart = DateTime.toEpochMillis(displayLimitedRange.start);
    const limitEnd = DateTime.toEpochMillis(displayLimitedRange.end);
    const viewStart = viewRangeAndStep.start;
    const viewEnd = viewRangeAndStep.end;
    const viewDuration = viewEnd - viewStart;

    // Pattern match different overlap scenarios between limited range and view range
    return match({
      limitStart,
      limitEnd,
      viewStart,
      viewEnd,
      limitExtendsBeforeView: limitStart < viewStart,
      limitExtendsAfterView: limitEnd > viewEnd,
      limitFullyBeforeView: limitEnd <= viewStart,
      limitFullyAfterView: limitStart >= viewEnd
    })
      // Limited range is completely before view - show full fade
      .with({ limitFullyBeforeView: true }, () => ({
        left: 0,
        right: 0,
        startMs: limitStart,
        endMs: limitEnd,
        showFullFade: true
      }))
      // Limited range is completely after view - show full fade
      .with({ limitFullyAfterView: true }, () => ({
        left: 0,
        right: 0,
        startMs: limitStart,
        endMs: limitEnd,
        showFullFade: true
      }))
      // Limited range extends before view start but ends within view
      .with({ limitExtendsBeforeView: true, limitExtendsAfterView: false }, () => ({
        left: 0, // No left fade since limited range starts before view
        right: Math.max(0, ((viewEnd - limitEnd) / viewDuration) * 100),
        startMs: limitStart,
        endMs: limitEnd,
        showFullFade: false
      }))
      // Limited range starts within view but extends after view end
      .with({ limitExtendsBeforeView: false, limitExtendsAfterView: true }, () => ({
        left: Math.max(0, ((limitStart - viewStart) / viewDuration) * 100),
        right: 0, // No right fade since limited range extends beyond view
        startMs: limitStart,
        endMs: limitEnd,
        showFullFade: false
      }))
      // Limited range extends both before and after view - show no fade
      .with({ limitExtendsBeforeView: true, limitExtendsAfterView: true }, () => ({
        left: 0,
        right: 0,
        startMs: limitStart,
        endMs: limitEnd,
        showFullFade: false
      }))
      // Limited range is fully contained within view - normal calculation
      .otherwise(() => ({
        left: Math.max(0, ((limitStart - viewStart) / viewDuration) * 100),
        right: Math.max(0, ((viewEnd - limitEnd) / viewDuration) * 100),
        startMs: limitStart,
        endMs: limitEnd,
        showFullFade: false
      }));
  }, [displayLimitedRange, viewRangeAndStep]);

  // Handle dragging limited range boundaries (supports both mouse and touch)
  useEffect(() => {
    if (!draggingBoundary || !sliderRef.current || !limitedRange) return;

    const handlePointerMove = (clientX: number) => {
      const rect = sliderRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const viewStart = viewRangeAndStep.start;
      const viewEnd = viewRangeAndStep.end;
      const viewDuration = viewEnd - viewStart;
      const newMs = viewStart + (percent * viewDuration);

      // Round to increment (the grid step in instant mode)
      const incrementMs = instantStepMs || increment || 5 * 60 * 1000;
      let roundedMs = Math.round(newMs / incrementMs) * incrementMs;

      // Enforce earliestValidDateTime constraint
      if (displayEarliestValidDateTime) {
        const minMs = DateTime.toEpochMillis(displayEarliestValidDateTime);
        roundedMs = Math.max(roundedMs, minMs);
      }

      // Enforce latestValidDateTime constraint
      if (displayLatestValidDateTime) {
        const maxMs = DateTime.toEpochMillis(displayLatestValidDateTime);
        roundedMs = Math.min(roundedMs, maxMs);
      }

      if (draggingBoundary === 'start') {
        const newStart = pipe(
          roundedMs,
          x => DateTime.unsafeFromDate(new Date(x)),
          fromDisplay
        );
        limitedRange.set({ start: newStart });
      } else {
        const newEnd = pipe(
          roundedMs,
          x => DateTime.unsafeFromDate(new Date(x)),
          fromDisplay
        );
        limitedRange.set({ end: newEnd });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault(); // Prevent scrolling while dragging
        handlePointerMove(e.touches[0].clientX);
      }
    };

    const handlePointerEnd = () => {
      setDraggingBoundary(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handlePointerEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handlePointerEnd);
    document.addEventListener('touchcancel', handlePointerEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handlePointerEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handlePointerEnd);
      document.removeEventListener('touchcancel', handlePointerEnd);
    };
  }, [draggingBoundary, viewRangeAndStep, increment, instantStepMs, limitedRange, fromDisplay, displayEarliestValidDateTime, displayLatestValidDateTime]);

  /**
   * Instant mode's track: one thumb, so no minimum gap and no translate-versus-
   * resize. A click or drag moves the thumb to the nearest grid point, kept
   * inside the animation range and the valid range.
   */
  const handleInstantChange = (e: Event, value: number | number[], stepMs: number) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const validRange = { min: earliestValidDateTime, max: latestValidDateTime };

    // A click or tap outside the animation range moves the range there, as in
    // range mode. A drag or arrow key past its edge stops at the edge instead.
    const isPress = e.type === 'mousedown' || e.type === 'touchstart';
    if (displayLimitedRange && limitedRange && isPress) {
      const limitStart = DateTime.toEpochMillis(displayLimitedRange.start);
      const limitEnd = DateTime.toEpochMillis(displayLimitedRange.end);
      const edt = earliestValidDateTime ? DateTime.toEpochMillis(earliestValidDateTime) : -Infinity;
      const ldt = latestValidDateTime ? DateTime.toEpochMillis(latestValidDateTime) : Infinity;
      if ((raw < limitStart || raw > limitEnd) && raw >= edt && raw <= ldt) {
        const start = snapInstant(DateTime.unsafeMake(raw), stepMs, 'nearest', validRange);
        const startMs = DateTime.toEpochMillis(start);
        const end = DateTime.unsafeMake(Math.min(startMs + (limitEnd - limitStart), ldt));
        limitedRange.set({ start, end });
        primaryRange.set({ start });
        return;
      }
    }

    let ms = nearestGridPoint(raw, stepMs);
    if (displayLimitedRange) {
      const first = ceilToGrid(DateTime.toEpochMillis(displayLimitedRange.start), stepMs);
      const last = floorToGrid(DateTime.toEpochMillis(displayLimitedRange.end), stepMs);
      // A range shorter than a step may hold no grid point; then there is nothing to keep it in.
      if (first <= last) ms = Math.min(Math.max(ms, first), last);
    }
    primaryRange.set({ start: snapInstant(DateTime.unsafeMake(ms), stepMs, 'nearest', validRange) });
  };

  return (
    <div className={`horizontal-calendar-grid`}>
      <div>
        {/* Without the date it stays as room for the thumb's time label. */}
        <div className="horizontal-calendar-grid-header">
          <div style={{ left: headerGridLocation }} className="horizontal-calendar-grid-header-label">
            {showDateHeader &&
              `${getMonth(DateTime.getPart(displayViewRange.end, "month"))} ` +
              `${DateTime.getPart(displayViewRange.end, "day")}, ` +
              `${DateTime.getPart(displayViewRange.end, "year")}`}
          </div>
        </div>
      </div>
      <Box ref={sliderRef} sx={{ maxWidth: "100%", boxSizing: "border-box", position: "relative" }} className={`horizontal-calendar-grid-body${instantStepMs ? ' instant-track' : ''} ${match(sliderActive)
        .with(SliderActive.Inactive, () => "hide-slider-components")
        .with(SliderActive.RightActive, () => "hide-left-slider-component")
        .with(SliderActive.LeftActive, () => "hide-right-slider-component")
        .otherwise(() => "")
        }`}>
        {/* Limited range visual indicators */}
        {limitedRangePosition && limitedRange && (
          <>
            {/* Dim overlay for areas OUTSIDE the animation range */}
            {limitedRangePosition.showFullFade ? (
              // Full fade when limited range is completely outside view
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: colors.compBg,
                opacity: 0.7,
                pointerEvents: 'none',
                zIndex: 1,
              }} />
            ) : (
              <>
                {/* Left dim area - only show if limited range starts within view */}
                {limitedRangePosition.left > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    width: `${limitedRangePosition.left}%`,
                    top: 0,
                    bottom: 0,
                    backgroundColor: colors.compBg,
                    opacity: 0.7,
                    pointerEvents: 'none',
                    zIndex: 1,
                  }} />
                )}

                {/* Right dim area - only show if limited range ends within view */}
                {limitedRangePosition.right > 0 && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    width: `${limitedRangePosition.right}%`,
                    top: 0,
                    bottom: 0,
                    backgroundColor: colors.compBg,
                    opacity: 0.7,
                    pointerEvents: 'none',
                    zIndex: 1,
                  }} />
                )}
              </>
            )}

            {/* Start boundary - simple and subtle */}
            <div
              style={{
                position: 'absolute',
                left: `${limitedRangePosition.left}%`,
                top: 0,
                bottom: 0,
                width: '24px',
                marginLeft: '-12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'ew-resize',
                zIndex: 2,
                touchAction: 'none',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggingBoundary('start');
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggingBoundary('start');
              }}
              onMouseEnter={() => setHoveringBoundary('start')}
              onMouseLeave={() => setHoveringBoundary(null)}
            >
              <div style={{
                width: '3px',
                height: '100%',
                backgroundColor: colors.activity,
                opacity: draggingBoundary === 'start' ? 1 :
                  hoveringBoundary === 'start' ? 0.8 : 0.6,
                borderRadius: '2px',
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease',
              }} />
            </div>

            {/* End boundary - simple and subtle */}
            <div
              style={{
                position: 'absolute',
                right: `${limitedRangePosition.right}%`,
                top: 0,
                bottom: 0,
                width: '24px',
                marginRight: '-12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'ew-resize',
                zIndex: 2,
                touchAction: 'none',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggingBoundary('end');
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggingBoundary('end');
              }}
              onMouseEnter={() => setHoveringBoundary('end')}
              onMouseLeave={() => setHoveringBoundary(null)}
            >
              <div style={{
                width: '3px',
                height: '100%',
                backgroundColor: colors.activity,
                opacity: draggingBoundary === 'end' ? 1 :
                  hoveringBoundary === 'end' ? 0.8 : 0.6,
                borderRadius: '2px',
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease',
              }} />
            </div>
          </>
        )}
        {/* Earliest valid date time visual indicator - shows left-side disabled region */}
        {earliestValidPosition && (
          <>
            {/* Dim overlay for disabled area (before earliestValidDateTime) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: earliestValidPosition.fullyCovered ? 0 : `calc(${100 - earliestValidPosition.percent}% + 12px)`,
                top: 0,
                bottom: 0,
                backgroundColor: colors.compBg,
                opacity: 0.7,
                cursor: 'not-allowed',
                zIndex: 1,
              }}
              onMouseEnter={() => setHoveringDisabledRegion('left')}
              onMouseLeave={() => setHoveringDisabledRegion(null)}
            />
            {/* Boundary line at cutoff point - only show when cutoff is visible */}
            {!earliestValidPosition.fullyCovered && (
              <div style={{
                position: 'absolute',
                left: `${earliestValidPosition.percent}%`,
                top: 0,
                bottom: 0,
                width: '3px',
                marginLeft: '-11px',
                backgroundColor: colors.boundary,
                opacity: 0.8,
                pointerEvents: 'none',
                zIndex: 2,
                borderRadius: '1px',
              }} />
            )}
            {/* Tooltip for disabled region */}
            {hoveringDisabledRegion === 'left' && (
              <div style={{
                position: 'absolute',
                left: earliestValidPosition.fullyCovered ? '50%' : `calc(${earliestValidPosition.percent}% - 80px)`,
                transform: earliestValidPosition.fullyCovered ? 'translateX(-50%)' : 'none',
                top: '-28px',
                backgroundColor: theme === AppTheme.Dark ? '#374151' : '#1f2937',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                No data available
              </div>
            )}
          </>
        )}
        {/* Latest valid date time visual indicator - shows right-side disabled region */}
        {latestValidPosition && (
          <>
            {/* Dim overlay for disabled area (beyond latestValidDateTime). Instant mode
                hatches it from the bound itself; the thumb sits above it. */}
            <div
              className={instantStepMs ? 'latest-overlay-instant' : undefined}
              style={{
                position: 'absolute',
                left: latestValidPosition.fullyCovered ? 0
                  : instantStepMs ? `${latestValidPosition.percent}%`
                    : `calc(${latestValidPosition.percent}% + 12px)`,
                right: 0,
                top: 0,
                bottom: 0,
                ...(instantStepMs ? {} : { backgroundColor: colors.compBg, opacity: 0.7 }),
                cursor: 'not-allowed',
                zIndex: 1,
              }}
              onMouseEnter={() => setHoveringDisabledRegion('right')}
              onMouseLeave={() => setHoveringDisabledRegion(null)}
            />
            {/* Instant mode marks the newest selectable time with a labelled line. */}
            {instantStepMs && !latestValidPosition.fullyCovered && (
              <>
                <div className="latest-line" style={{ left: `${latestValidPosition.percent}%` }} />
                <div className="latest-tag" style={{ left: `${latestValidPosition.percent}%` }}>Latest</div>
              </>
            )}
            {/* Boundary line at cutoff point - only show when cutoff is visible */}
            {!instantStepMs && !latestValidPosition.fullyCovered && (
              <div style={{
                position: 'absolute',
                left: `${latestValidPosition.percent}%`,
                top: 0,
                bottom: 0,
                width: '3px',
                marginLeft: '8px',
                backgroundColor: colors.boundary,
                opacity: 0.8,
                pointerEvents: 'none',
                zIndex: 2,
                borderRadius: '1px',
              }} />
            )}
            {/* Tooltip for disabled region */}
            {hoveringDisabledRegion === 'right' && (
              <div style={{
                position: 'absolute',
                left: latestValidPosition.fullyCovered ? '50%' : `calc(${latestValidPosition.percent}% + 16px)`,
                transform: latestValidPosition.fullyCovered ? 'translateX(-50%)' : 'none',
                top: '-28px',
                backgroundColor: theme === AppTheme.Dark ? '#374151' : '#1f2937',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                No data available
              </div>
            )}
          </>
        )}
        <Slider
          sx={sliderSx}
          getAriaLabel={() => instantStepMs ? 'Selected time' : 'Minimum distance'}
          getAriaValueText={instantStepMs
            ? (value) => DateTime.formatIso(DateTime.unsafeMake(value))
            : undefined}
          value={instantStepMs ? primaryRangeMillis[0] : primaryRangeMillis}
          track={instantStepMs ? false : 'normal'}
          onChange={(e, _newValue, activeThumb) => {
            if (instantStepMs) {
              handleInstantChange(e, _newValue, instantStepMs);
              return;
            }
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
             * PRIORITY CHECK: Clicking outside limited range
             * Handle this first before any other logic
             */
            if (displayLimitedRange && limitedRange && e.type !== 'mousemove') {
              const clickPosition = activeThumb === 0
                ? (newValue as [number, number])[0]
                : (newValue as [number, number])[1];

              const limitStart = DateTime.toEpochMillis(displayLimitedRange.start);
              const limitEnd = DateTime.toEpochMillis(displayLimitedRange.end);

              // Check if click is outside the limited range
              if (clickPosition < limitStart || clickPosition > limitEnd) {
                // Check if click is within valid date range
                const edt = displayEarliestValidDateTime
                  ? DateTime.toEpochMillis(displayEarliestValidDateTime)
                  : -Infinity;
                const ldt = displayLatestValidDateTime
                  ? DateTime.toEpochMillis(displayLatestValidDateTime)
                  : Infinity;

                if (clickPosition >= edt && clickPosition <= ldt) {
                  const limitedDuration = limitEnd - limitStart;
                  const primaryDuration = primaryRangeMillis[1] - primaryRangeMillis[0];

                  // Round to increment
                  const baseTime = DateTime.toEpochMillis(displayViewRange.start);
                  const offsetFromBase = clickPosition - baseTime;
                  const roundedOffset = Math.round(offsetFromBase / incrementMs) * incrementMs;
                  let roundedClickPosition = baseTime + roundedOffset;

                  // Ensure click position is within valid range after rounding
                  roundedClickPosition = Math.max(roundedClickPosition, edt);
                  roundedClickPosition = Math.min(roundedClickPosition, ldt);

                  // Move limited range to start at click position
                  let newLimitStart = roundedClickPosition;
                  let newLimitEnd = Math.min(newLimitStart + limitedDuration, ldt);

                  // Ensure start is not before earliest valid
                  if (newLimitStart < edt) {
                    newLimitStart = edt;
                    newLimitEnd = Math.min(newLimitStart + limitedDuration, ldt);
                  }

                  // Update limited range state
                  const limitStartDateTime = pipe(
                    newLimitStart,
                    x => DateTime.unsafeFromDate(new Date(x)),
                    fromDisplay
                  );
                  const limitEndDateTime = pipe(
                    newLimitEnd,
                    x => DateTime.unsafeFromDate(new Date(x)),
                    fromDisplay
                  );
                  limitedRange.set({ start: limitStartDateTime, end: limitEndDateTime });

                  // Move primary range to start of new limited range
                  const newStart = newLimitStart;
                  const newEnd = Math.min(newStart + primaryDuration, newLimitEnd);

                  // Convert to UTC and update primary range
                  const start = pipe(
                    newStart,
                    x => DateTime.unsafeFromDate(new Date(x)),
                    fromDisplay
                  );
                  const end = pipe(
                    newEnd,
                    x => DateTime.unsafeFromDate(new Date(x)),
                    fromDisplay
                  );
                  primaryRange.set({ start, end });
                  return; // Exit early - we're done
                }
              }
            }

            /**
             * ORIGINAL LOGIC: Handle normal clicks and drags
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
            let [newStart, newEnd] = match(isWithinOrMouseMove)
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
             * Constrain to limitedRange if it exists
             */
            if (displayLimitedRange) {
              const limitStart = DateTime.toEpochMillis(displayLimitedRange.start);
              const limitEnd = DateTime.toEpochMillis(displayLimitedRange.end);

              // If the range extends beyond the limit, constrain it
              if (newStart < limitStart) {
                const duration = newEnd - newStart;
                newStart = limitStart;
                newEnd = newStart + duration;
              }
              if (newEnd > limitEnd) {
                const duration = newEnd - newStart;
                newEnd = limitEnd;
                newStart = newEnd - duration;
              }

              // Final check to ensure we're within bounds
              newStart = Math.max(newStart, limitStart);
              newEnd = Math.min(newEnd, limitEnd);
            }

            /**
             * Enforce earliest valid date time if set
             */
            const edt = displayEarliestValidDateTime
              ? DateTime.toEpochMillis(displayEarliestValidDateTime)
              : -1;
            if (edt !== -1 && Math.min(newStart, newEnd) < edt) {
              newStart = edt;
              newEnd = edt + incrementMs;
            }

            /**
             * Enforce latest valid date time if set
             */
            const ldt = displayLatestValidDateTime
              ? DateTime.toEpochMillis(displayLatestValidDateTime)
              : -1;
            if (ldt !== -1 && Math.max(newStart, newEnd) > ldt) {
              newEnd = ldt;
              newStart = ldt - incrementMs;
            }

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
          valueLabelDisplay={instantStepMs ? 'on' : 'off'}
          valueLabelFormat={(value) => instantStepMs
            ? formatClockTime(new Date(value), getDisplayZone())
            : DateTime.formatIsoDate(DateTime.unsafeFromDate(new Date(value)))}
          step={null}
          marks={viewRangeAndStep.stepArr}
          min={viewRangeAndStep.start}
          max={viewRangeAndStep.end}
          slotProps={{
            thumb: (__, thumbProps) => {
              const dataIndex = thumbProps?.['data-index'];

              return {
                'data-index': dataIndex,
                style: {
                  width: '12px',
                  height: '24px',
                  borderRadius: '2px',
                  backgroundColor: theme === AppTheme.Dark ? '#4a9eff' : '#005ea2',
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
