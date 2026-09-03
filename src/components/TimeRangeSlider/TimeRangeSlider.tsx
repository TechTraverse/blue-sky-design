import './timeRangeSlider.css';
import { useEffect, useReducer, useRef, useMemo, useCallback, useState } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Duration, Effect, Schedule, Fiber } from 'effect';
import { PrevDateButton, NextDateButton } from "./NewArrowButtons";
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';
import { AnimateAndStepControls } from './AnimateAndStepControls';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, Theme as AppTheme, TimeZone } from './timeSliderTypes';
import { computeNextAnimationFrame, makeAnimationLoopEffect, DEFAULT_MAX_WAIT_MS } from './animationFrame';
import { acceptsTrackLatestRebase, isStepBlocked, makeStepLattice, normalizeStepPositions, resolveStepMs, sequenceCursor, stepSelection } from './stepping';
import type { StepDirection, StepResolution } from './stepping';
import {
  DEFAULT_ANIMATION_DURATION,
  ExtSetIncrement,
  ExtSetSelectedDuration,
  ExtSetSelectedStartDateTime,
  ExtSetTimeZone,
  HandleResize,
  ResetAll,
  SetAnimationDuration,
  SetAnimationOrStepMode,
  SetAnimationPlayMode,
  SetAnimationSpeed,
  SetAnimationStartDateTime,
  SetLastKnownLatestDate,
  SetResetDuration,
  SetResetStartDateTime,
  SetSelectedDuration,
  SetSelectedStartDateTime,
  SetTimeZone,
  SetTrackingLatest,
  SetViewDuration,
  SetViewStartDateTime,
  UpdateSource,
  reducer,
  withMiddleware,
} from './timeSliderReducer';
import type { DateUpdateSource } from './timeSliderReducer';
import type { FrameAdvance } from './animationFrame';
import { DateAndRangeSelect } from './DateAndRangeSelect';
import { Divider, IconButton, Tooltip } from '@mui/material';
import { MdMyLocation, MdFastForward } from 'react-icons/md';
import { TimeZoneDisplayProvider } from '../../contexts/TimeZoneDisplayContext';

/**
 * Local types for state, actions, and props
 */

/** Reported on every step press. The button is disabled at the ends, so `to` is
 * null only if a clamp refused a press that got through anyway. */
export interface StepRequest {
  direction: StepDirection;
  from: Date;
  /** Where the step landed, or null when a clamp refused it. */
  to: Date | null;
  /** Whether an observed frame or the lattice produced the destination. */
  resolvedBy: StepResolution;
}

export interface TimeRangeSliderProps {
  dateRange?: RangeValue<Date>;
  /** The range the reset control returns to. Not a constraint on the selection. */
  dateRangeForReset?: RangeValue<Date>;
  /**
   * The only constraint on the selection: start = earliest allowed instant,
   * end = latest. Either end may be omitted to leave that side open, and the
   * whole prop omitted to leave the selection unconstrained.
   */
  availableDateRange?: Partial<RangeValue<Date>>;
  /** Called when the selection changes, with why it changed. */
  onDateRangeSelect: (rv: RangeValue<Date>, source: DateUpdateSource) => void;
  getLatestDateRange?: () => Promise<Date>;
  animationRequestFrequency?: AnimationRequestFrequency;
  className?: string;
  theme?: AppTheme;
  timeZone?: TimeZone;
  onTimeZoneChange?: (timeZone: TimeZone) => void;
  onAnimationOrStepModeChange?: (mode: AnimationOrStepMode) => void;
  increment?: TimeDuration;
  /**
   * Distance in milliseconds the step buttons move the selection. Independent
   * of the selection width, so a 5-minute window can step 30 seconds. Whole
   * milliseconds; falls back to the selection width when omitted or not a
   * positive finite number.
   * Does not affect drag snapping, which follows `increment`.
   */
  stepSizeMs?: number;
  /**
   * Origin of the step lattice, owned by the consumer's datetime service. Steps
   * land on `stepAnchor + stepPhaseMs + k * stepSizeMs`. Omit for free-running
   * `cursor ± stepSizeMs` steps.
   *
   * A step sequence is anchored until something other than a step moves the
   * selection, so the consumer must echo `dateRange` back unchanged from
   * `onDateRangeSelect`; a rewritten value reads as a fresh external selection.
   */
  stepAnchor?: Date;
  /**
   * Offset of the lattice from `stepAnchor`, in milliseconds. Frame times do not
   * fall on a round-minute grid, so the phase cannot be derived from a clock.
   */
  stepPhaseMs?: number;
  /**
   * Observed frame instants for the current view, pushed down by the consumer's
   * frame index. Inside this span steps land on real frames; beyond it they fall
   * back to the lattice. Order does not matter. Stepping never fetches.
   * Memoise it: a new array each render re-normalises the list.
   */
  stepPositions?: readonly Date[];
  /** Called on every step press, including one a clamp refused. */
  onStepRequest?: (request: StepRequest) => void;
  hideAnimationToggle?: boolean;
  /** When provided, shows the animation toggle in a disabled state with this tooltip message */
  disabledAnimationTooltip?: string;
  /** When true, hides the date picker popup */
  hideDatePicker?: boolean;
  /** Polling interval in ms (default 60000). Set to 0 to disable polling. */
  pollingInterval?: number;
  /** Called when poll detects data newer than current selection */
  onNewDataAvailable?: (latestDate: Date, currentSelectionEnd: Date) => void;
  /** Called when tracking mode changes */
  onTrackLatestChange?: (enabled: boolean) => void;
  /** Initial tracking state (default false) */
  initialTrackLatest?: boolean;
  /**
   * How the animation clock advances between frames. Omit for the default
   * fixed-rate behavior; pass `{ mode: 'backpressure', onFrameSettled }` to gate
   * advancement on tile loads (see {@link FrameAdvance}).
   */
  frameAdvance?: FrameAdvance;
}

/**
 * Helper functions
 */



const widthToDuration: (width: number) => Duration.Duration = (width) => match(width)
  .with(P.number.lt(100), () => Duration.minutes(30))
  .with(P.number.lt(200), () => Duration.hours(1))
  .with(P.number.lt(400), () => Duration.hours(2))
  .with(P.number.lt(600), () => Duration.hours(3))
  .with(P.number.lt(800), () => Duration.hours(4))
  .with(P.number.lt(1000), () => Duration.hours(5))
  .with(P.number.lt(1200), () => Duration.hours(6))
  .with(P.number.lt(1400), () => Duration.hours(7))
  .with(P.number.lt(1600), () => Duration.hours(8))
  .with(P.number.lt(1800), () => Duration.hours(9))
  .with(P.number.lt(2000), () => Duration.hours(10))
  .with(P.number.lt(2200), () => Duration.hours(12))
  .otherwise(() => Duration.hours(21));

/**
 * Exported component
 */

export const TimeRangeSlider = ({
  dateRange,
  dateRangeForReset,
  availableDateRange,
  onDateRangeSelect,
  getLatestDateRange,
  animationRequestFrequency = AnimationRequestFrequency['1 fps'],
  className = "",
  theme = AppTheme.Light,
  timeZone = TimeZone.Local,
  onTimeZoneChange,
  onAnimationOrStepModeChange,
  increment = TimeDuration["5m"],
  stepSizeMs,
  stepAnchor,
  stepPhaseMs,
  stepPositions,
  onStepRequest,
  hideAnimationToggle = false,
  disabledAnimationTooltip,
  hideDatePicker = false,
  pollingInterval = 60000,
  onNewDataAvailable,
  onTrackLatestChange,
  initialTrackLatest = false,
  frameAdvance,
}: TimeRangeSliderProps) => {

  const viewIncrement = increment;

  const roundDateTimeDownToNearestIncrement = (dateTime: DateTime.DateTime): DateTime.DateTime => {
    const incrementMinutes = viewIncrement / (60 * 1000);
    return dateTime.pipe(
      DateTime.toParts,
      (parts) => {
        const roundedToFloorMins = Math.floor(parts.minutes / incrementMinutes) * incrementMinutes;
        return DateTime.unsafeMake({
          ...parts,
          minutes: roundedToFloorMins,
          seconds: 0,
          milliseconds: 0,
        });
      });
  };

  const isSelectedTimeInView = (
    selectedStart: DateTime.DateTime,
    selectedDuration: Duration.Duration,
    viewStart: DateTime.DateTime,
    viewDuration: Duration.Duration
  ): boolean => {
    const selectedEnd = DateTime.addDuration(selectedStart, selectedDuration);
    const viewEnd = DateTime.addDuration(viewStart, viewDuration);

    // Check for ANY overlap between selected range and viewport
    return DateTime.lessThan(selectedStart, viewEnd) &&
      DateTime.greaterThan(selectedEnd, viewStart);
  };

  const calculateCenteredViewStart = (
    selectedStart: DateTime.DateTime,
    selectedDuration: Duration.Duration,
    viewDuration: Duration.Duration
  ): DateTime.DateTime => {
    // Always center the selection in the view
    const selectionMidpoint = DateTime.addDuration(
      selectedStart,
      Duration.millis(Duration.toMillis(selectedDuration) / 2)
    );
    const unroundedViewStart = DateTime.subtractDuration(
      selectionMidpoint,
      Duration.millis(Duration.toMillis(viewDuration) / 2)
    );
    return roundDateTimeDownToNearestIncrement(unroundedViewStart);
  };

  const calculateOptimalViewStart = (
    _pStart: DateTime.DateTime,
    nStart: DateTime.DateTime,
    nDuration: Duration.Duration,
    cViewStart: DateTime.DateTime,
    cViewDuration: Duration.Duration
  ): DateTime.DateTime => {
    // Check if new selection is outside current view
    const nEnd = DateTime.addDuration(nStart, nDuration);
    const cViewEnd = DateTime.addDuration(cViewStart, cViewDuration);
    const isOutsideView = DateTime.lessThan(nStart, cViewStart) || DateTime.greaterThan(nEnd, cViewEnd);

    if (isOutsideView) {
      // Center the selection in the view
      const selectionMidpoint = DateTime.addDuration(nStart, Duration.millis(Duration.toMillis(nDuration) / 2));
      const unroundedViewStart = DateTime.subtractDuration(selectionMidpoint, Duration.millis(Duration.toMillis(cViewDuration) / 2));
      return roundDateTimeDownToNearestIncrement(unroundedViewStart);
    }

    // Selection is within view, keep current view
    return cViewStart;
  };

  const initialValues = useMemo(() => {
    // Fixed init vals
    const timeZone = TimeZone.Local;
    const animationSpeed = AnimationSpeed['5 min/sec'];
    const resetAnimationSpeed = AnimationSpeed['5 min/sec'];
    const resetAnimationDuration = DEFAULT_ANIMATION_DURATION;
    const animationDuration = DEFAULT_ANIMATION_DURATION;
    const animationPlayMode = PlayMode.Pause;
    const animationOrStepMode = AnimationOrStepMode.Step;
    const viewDuration = Duration.hours(4);
    const increment = TimeDuration["5m"];

    // Values for calculating remaining initial state
    const selectedStartDateTime = match(dateRange)
      .with({ start: P.instanceOf(Date) },
        (x) => DateTime.unsafeFromDate(x.start))
      .otherwise(() => {
        console.warn("TimeRangeSlider: dateRange prop is malformed or undefined, defaulting to current time");
        const now = DateTime.unsafeNow().pipe(roundDateTimeDownToNearestIncrement);
        return now;
      });
    const animationStartDateTime = selectedStartDateTime;

    const selectedDuration = match(dateRange)
      .with({ start: P.instanceOf(Date), end: P.instanceOf(Date) },
        (x) => {
          const start = DateTime.unsafeFromDate(x.start);
          const end = DateTime.unsafeFromDate(x.end);
          return DateTime.distanceDuration(start, end);
        })
      .otherwise(() => {
        console.warn("TimeRangeSlider: dateRange prop is malformed or undefined, defaulting to 5 minute range");
        return Duration.minutes(5);
      });

    const resetStartDateTime = match(dateRangeForReset)
      .with({ start: P.instanceOf(Date) },
        (x) => DateTime.lessThan(DateTime.unsafeFromDate(x.start), selectedStartDateTime),
        () => {
          console.warn("TimeRangeSlider: dateRangeForReset.start is earlier than dateRange.start, defaulting to dateRange.start");
          return selectedStartDateTime;
        })
      .with({ start: P.instanceOf(Date) },
        (x) => DateTime.unsafeFromDate(x.start))
      .otherwise(() => selectedStartDateTime);

    const resetDuration = match(dateRangeForReset)
      .with({ start: P.instanceOf(Date), end: P.instanceOf(Date) },
        (x) => {
          const start = DateTime.unsafeFromDate(x.start);
          const end = DateTime.unsafeFromDate(x.end);
          if (DateTime.lessThan(end, start)) {
            console.warn("TimeRangeSlider: dateRangeForReset.end is earlier than dateRangeForReset.start, defaulting to 5 minute range");
            return Duration.minutes(5);
          }
          return DateTime.distanceDuration(start, end);
        })
      .otherwise(() => selectedDuration);
    const viewStartDateTime = calculateOptimalViewStart(
      selectedStartDateTime,
      selectedStartDateTime,
      selectedDuration,
      roundDateTimeDownToNearestIncrement(DateTime.subtractDuration(selectedStartDateTime, Duration.hours(2))),
      viewDuration
    );

    return {
      timeZone,
      increment,
      viewStartDateTime,
      viewDuration,

      resetStartDateTime,
      resetDuration,

      selectedStartDateTime,
      selectedDuration,
      stepCursor: null,

      animationOrStepMode,

      resetAnimationSpeed,
      resetAnimationDuration,
      animationStartDateTime,
      animationDuration,
      animationRequestFrequency,
      animationPlayMode,
      animationSpeed,

      isTrackingLatest: initialTrackLatest,
      lastKnownLatestDate: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [s, d] = useReducer(withMiddleware(reducer, onDateRangeSelect, roundDateTimeDownToNearestIncrement, onTimeZoneChange, onAnimationOrStepModeChange, onTrackLatestChange), null, () => initialValues);


  /**
   * Set up observer to update view duration based on the width of the slider
   */
  // Ref to access current state in delayed animation actions
  const stateRef = useRef(s);
  stateRef.current = s;

  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSliderHidden, setIsSliderHidden] = useState(false);

  /**
   * Center selected time on first load
   */
  const hasInitialCenteredRef = useRef(false);
  useEffect(() => {
    // Only run once on first mount, after initial render
    if (hasInitialCenteredRef.current || !sliderRef.current) return;

    // Calculate centered view position (always center on first load)
    const centeredViewStart = calculateCenteredViewStart(
      s.selectedStartDateTime,
      s.selectedDuration,
      s.viewDuration
    );

    // Only update if it would actually change the view
    const needsUpdate = DateTime.toEpochMillis(centeredViewStart) !==
      DateTime.toEpochMillis(s.viewStartDateTime);

    if (needsUpdate) {
      d(SetViewStartDateTime({ viewStartDateTime: centeredViewStart }));
    }

    hasInitialCenteredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - runs once after mount

  /**
   * ResizeObserver with conditional centering
   */
  const resizeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const newViewDuration = widthToDuration(width);

        // Only process if duration actually changed
        if (Duration.toMillis(newViewDuration) === Duration.toMillis(stateRef.current.viewDuration)) {
          continue;
        }

        // Clear any pending resize handling
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }

        // Debounce the resize handling (50ms)
        resizeTimeoutRef.current = setTimeout(() => {
          // Skip if in animation mode (handled by existing animation centering logic)
          if (stateRef.current.animationOrStepMode === AnimationOrStepMode.Animation) {
            d(SetViewDuration({ viewDuration: newViewDuration }));
            return;
          }

          // Capture current state before resize
          const currentViewStart = stateRef.current.viewStartDateTime;
          const currentViewDuration = stateRef.current.viewDuration;
          const selectedStart = stateRef.current.selectedStartDateTime;
          const selectedDuration = stateRef.current.selectedDuration;

          // Check if selected time has ANY overlap with current viewport
          const wasVisible = isSelectedTimeInView(
            selectedStart,
            selectedDuration,
            currentViewStart,
            currentViewDuration
          );

          // Dispatch combined resize action with conditional centering
          d(HandleResize({
            newViewDuration,
            shouldCenter: wasVisible
          }));
        }, 50);
      }
    });

    const sliderElement = sliderRef.current;
    if (sliderElement) {
      resizeObserver.observe(sliderElement);
    }

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (sliderElement) {
        resizeObserver.unobserve(sliderElement);
      }
    };
  }, []);

  /**
   * ResizeObserver for container to determine mobile/compact view
   * Watches the parent container to decide whether to hide the slider
   */
  useEffect(() => {
    const containerResizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Hide slider when container is too narrow for usable interaction
        setIsSliderHidden(width < 820);
      }
    });

    const containerElement = containerRef.current;
    if (containerElement) {
      containerResizeObserver.observe(containerElement);
    }

    return () => {
      if (containerElement) {
        containerResizeObserver.unobserve(containerElement);
      }
    };
  }, []);

  /**
   * Ensure limited range (animation range) is initially centered in view
   * Debounced to prevent excessive centering during rapid state changes
   */
  const lastCenteringRef = useRef<number>(0);
  const centeringTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (s.animationOrStepMode !== AnimationOrStepMode.Animation) return;

    // Clear any pending centering
    if (centeringTimeoutRef.current) {
      clearTimeout(centeringTimeoutRef.current);
    }

    // Debounce centering operations to reduce excessive calls
    centeringTimeoutRef.current = setTimeout(() => {
      // Throttle to prevent rapid-fire centering
      const now = Date.now();
      if (now - lastCenteringRef.current < 100) return;

      // Calculate center of animation range
      const animationMidpoint = DateTime.addDuration(
        s.animationStartDateTime,
        Duration.millis(Duration.toMillis(s.animationDuration) / 2)
      );

      // Calculate ideal view start to center the animation range
      const idealViewStart = DateTime.subtractDuration(
        animationMidpoint,
        Duration.millis(Duration.toMillis(s.viewDuration) / 2)
      );

      // Round to increment
      const roundedViewStart = roundDateTimeDownToNearestIncrement(idealViewStart);

      // Only update if significantly different (more than 1 minute difference)
      const currentViewCenter = DateTime.addDuration(
        s.viewStartDateTime,
        Duration.millis(Duration.toMillis(s.viewDuration) / 2)
      );

      const distanceFromCenter = Math.abs(
        DateTime.toEpochMillis(animationMidpoint) - DateTime.toEpochMillis(currentViewCenter)
      );

      // Update view if animation range is not centered (tolerance: 1 minute)
      if (distanceFromCenter > 60000) {
        lastCenteringRef.current = now;
        d(SetViewStartDateTime({ viewStartDateTime: roundedViewStart }));
      }
    }, 50); // 50ms debounce

    return () => {
      if (centeringTimeoutRef.current) {
        clearTimeout(centeringTimeoutRef.current);
      }
    };
    // viewStartDateTime intentionally excluded - we only re-center when animation bounds change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.animationOrStepMode, s.animationStartDateTime, s.animationDuration, s.viewDuration]);

  /**
   * External prop change handlers
   */

  // Update selectedStartDateTime
  useEffect(() => {
    if (!dateRange?.start) return;

    match(dateRange.start)
      .with(P.instanceOf(Date),
        (x) => {
          const dtStart = DateTime.unsafeFromDate(x);
          const hasChanged = DateTime.distance(dtStart, s.selectedStartDateTime) !== 0;
          if (!hasChanged) return false;
          return hasChanged;
        }, (x) => {
          d(ExtSetSelectedStartDateTime({
            selectedStartDateTime: DateTime.unsafeFromDate(x),
            updateSource: UpdateSource.ExternalProp
          }));
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.start]);

  // Update selectedDuration
  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) return;

    match(dateRange)
      .with({ start: P.instanceOf(Date), end: P.instanceOf(Date) },
        ({ start, end }) => {
          const dtStart = DateTime.unsafeFromDate(start);
          const dtEnd = DateTime.unsafeFromDate(end);
          const newDuration = DateTime.distanceDuration(dtStart, dtEnd);
          const hasChanged = Duration.toMillis(newDuration) !== Duration.toMillis(s.selectedDuration);
          if (!hasChanged) return false;
          return hasChanged;
        }, (x) => {
          d(ExtSetSelectedDuration({
            selectedDuration: DateTime.distanceDuration(
              DateTime.unsafeFromDate(x.start),
              DateTime.unsafeFromDate(x.end)),
            updateSource: UpdateSource.ExternalProp
          }));
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange?.start, dateRange?.end]);

  // The same thing but for the reset time and duration
  useEffect(() => {
    if (!dateRangeForReset?.start) return;

    match(dateRangeForReset.start)
      .with(P.instanceOf(Date),
        (x) => {
          const dtStart = DateTime.unsafeFromDate(x);
          const hasChanged = DateTime.distance(dtStart, s.resetStartDateTime) !== 0;
          if (!hasChanged) return false;
          return hasChanged;
        }, (x) => {
          d(SetResetStartDateTime({ resetStartDateTime: DateTime.unsafeFromDate(x) }));
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeForReset?.start]);

  useEffect(() => {
    if (!dateRangeForReset?.start || !dateRangeForReset?.end) return;

    match(dateRangeForReset)
      .with({ start: P.instanceOf(Date), end: P.instanceOf(Date) },
        ({ start, end }) => {
          const dtStart = DateTime.unsafeFromDate(start);
          const dtEnd = DateTime.unsafeFromDate(end);
          const newDuration = DateTime.distanceDuration(dtStart, dtEnd);
          const hasChanged = Duration.toMillis(newDuration) !== Duration.toMillis(s.resetDuration);
          if (!hasChanged) return false;
          return hasChanged;
        }, (x) => {
          d(SetResetDuration({
            resetDuration: DateTime.distanceDuration(
              DateTime.unsafeFromDate(x.start),
              DateTime.unsafeFromDate(x.end))
          }));
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeForReset?.start, dateRangeForReset?.end]);

  // timeZone prop change
  useEffect(() => {
    if (timeZone !== s.timeZone) {
      d(ExtSetTimeZone({ timeZone }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeZone]);

  // increment prop change
  useEffect(() => {
    if (increment !== s.increment) {
      d(ExtSetIncrement({ increment }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [increment]);

  /**
   * Animation auto-increment logic (fixed-rate / default path)
   * Automatically advances the selection when in Animation mode and playing.
   * Back-pressure mode is handled by the gated Effect loop below instead.
   */
  useEffect(() => {
    if (frameAdvance?.mode === 'backpressure') {
      return; // gated loop below owns advancement in this mode
    }
    if (s.animationOrStepMode !== AnimationOrStepMode.Animation ||
      s.animationPlayMode !== PlayMode.Play) {
      return;
    }

    // Calculate milliseconds to advance per animation frame
    const animationSpeed = s.animationSpeed; // ms of simulated time per real second
    const frameMs = animationRequestFrequency; // ms per frame
    const advanceMs = (animationSpeed * frameMs) / 1000; // ms to advance per frame

    const intervalId = setInterval(() => {
      const { nextStart } = computeNextAnimationFrame(stateRef.current, advanceMs);
      d(SetSelectedStartDateTime({
        selectedStartDateTime: nextStart,
        updateSource: UpdateSource.Animation
      }));
    }, frameMs);

    return () => clearInterval(intervalId);
  }, [frameAdvance?.mode, s.animationOrStepMode, s.animationPlayMode, s.animationSpeed,
    animationRequestFrequency, s.animationStartDateTime, s.animationDuration]);

  /**
   * Animation auto-increment logic (back-pressure path)
   * When `frameAdvance.mode === 'backpressure'`, drive advancement from an
   * interruptible Effect fiber whose period is max(frameMs, onFrameSettled) so
   * playback slows to tile-load speed instead of flashing. Mirrors the
   * track-latest polling fiber lifecycle below.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const animationFiberRef = useRef<Fiber.RuntimeFiber<any, any> | null>(null);
  // Read the (object-identity-unstable) frameAdvance prop through a ref so the
  // fiber effect below doesn't tear down and restart on every parent render.
  const frameAdvanceRef = useRef(frameAdvance);
  frameAdvanceRef.current = frameAdvance;

  useEffect(() => {
    // Clean up any existing fiber
    if (animationFiberRef.current) {
      Effect.runFork(Fiber.interrupt(animationFiberRef.current));
      animationFiberRef.current = null;
    }

    if (frameAdvance?.mode !== 'backpressure') return;
    if (s.animationOrStepMode !== AnimationOrStepMode.Animation ||
      s.animationPlayMode !== PlayMode.Play) {
      return;
    }

    const frameMs = animationRequestFrequency;
    const advanceMs = (s.animationSpeed * frameMs) / 1000;

    const loop = makeAnimationLoopEffect({
      readState: () => stateRef.current,
      advanceMs,
      frameMs,
      dispatchFrame: (nextStart) => d(SetSelectedStartDateTime({
        selectedStartDateTime: nextStart,
        updateSource: UpdateSource.Animation
      })),
      onFrameSettled: (frame) => {
        const fa = frameAdvanceRef.current;
        return fa?.mode === 'backpressure' ? fa.onFrameSettled(frame) : Promise.resolve();
      },
      maxWaitMs: frameAdvance.maxWaitMs ?? DEFAULT_MAX_WAIT_MS,
    });

    animationFiberRef.current = Effect.runFork(loop);

    return () => {
      if (animationFiberRef.current) {
        Effect.runFork(Fiber.interrupt(animationFiberRef.current));
        animationFiberRef.current = null;
      }
    };
    // onFrameSettled/maxWaitMs are read via frameAdvanceRef (Correction 5), so
    // only stable primitives gate the fiber lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameAdvance?.mode, frameAdvance?.mode === 'backpressure' ? frameAdvance.maxWaitMs : undefined,
    s.animationOrStepMode, s.animationPlayMode,
    s.animationSpeed, animationRequestFrequency, s.animationStartDateTime, s.animationDuration]);

  /**
   * Track-latest polling logic using Effect Schedule
   * Polls for latest available data and notifies/updates when new data is available
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pollingFiberRef = useRef<Fiber.RuntimeFiber<any, any> | null>(null);

  useEffect(() => {
    // Clean up any existing fiber
    if (pollingFiberRef.current) {
      Effect.runFork(Fiber.interrupt(pollingFiberRef.current));
      pollingFiberRef.current = null;
    }

    if (!getLatestDateRange || pollingInterval <= 0) return;

    const pollOnce = Effect.gen(function* () {
      const latestDate = yield* Effect.tryPromise(() => getLatestDateRange());

      const latestDateTime = DateTime.unsafeFromDate(latestDate);
      const currentState = stateRef.current;
      const currentSelectionEnd = DateTime.addDuration(
        currentState.selectedStartDateTime,
        currentState.selectedDuration
      );

      // Update last known latest date
      d(SetLastKnownLatestDate({ lastKnownLatestDate: latestDateTime }));

      // Check if new data is available (latest > current selection end)
      if (DateTime.greaterThan(latestDateTime, currentSelectionEnd)) {
        // Always notify when new data is available
        onNewDataAvailable?.(latestDate, DateTime.toDate(currentSelectionEnd));

        // If tracking is enabled, also update selection. An active step sequence
        // holds the selection and the view still, so the poll cannot re-base it.
        if (currentState.isTrackingLatest && acceptsTrackLatestRebase(currentState.stepCursor)) {
          const newStart = DateTime.subtractDuration(latestDateTime, currentState.selectedDuration);
          d(SetSelectedStartDateTime({
            selectedStartDateTime: newStart,
            updateSource: UpdateSource.TrackLatestUpdate
          }));

          // Update view to show the new selection
          const optimalViewStart = calculateOptimalViewStart(
            currentState.selectedStartDateTime,
            newStart,
            currentState.selectedDuration,
            currentState.viewStartDateTime,
            currentState.viewDuration
          );
          d(SetViewStartDateTime({ viewStartDateTime: optimalViewStart }));
        }
      }
    }).pipe(
      Effect.catchAll((e) => Effect.sync(() => {
        console.error('[TimeRangeSlider] Poll failed:', e);
      }))
    );

    // Schedule: run immediately, then repeat with spaced interval
    const scheduledPoll = pollOnce.pipe(
      Effect.repeat(Schedule.spaced(Duration.millis(pollingInterval)))
    );

    // Run and store the fiber
    pollingFiberRef.current = Effect.runFork(scheduledPoll);

    return () => {
      if (pollingFiberRef.current) {
        Effect.runFork(Fiber.interrupt(pollingFiberRef.current));
        pollingFiberRef.current = null;
      }
    };
    // calculateOptimalViewStart uses stateRef.current, so it's intentionally not a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getLatestDateRange, pollingInterval, onNewDataAvailable]);

  /** Step distance, decoupled from the selection width. */
  const stepMs = useMemo(
    () => resolveStepMs(stepSizeMs, s.selectedDuration),
    [stepSizeMs, s.selectedDuration]);

  /** The one bound on the selection. Either end may be open. */
  const selectableRange = useMemo(
    () => {
      const min = availableDateRange?.start && DateTime.unsafeFromDate(availableDateRange.start);
      const max = availableDateRange?.end && DateTime.unsafeFromDate(availableDateRange.end);
      return min || max ? { min, max } : undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableDateRange?.start?.getTime(), availableDateRange?.end?.getTime()]);

  /** Observed frames the step buttons prefer, ascending. */
  const positions = useMemo(
    () => normalizeStepPositions(stepPositions), [stepPositions]);

  /** Lattice the step buttons walk. Undefined means free-running steps. */
  const stepLattice = useMemo(
    () => makeStepLattice(stepAnchor, stepPhaseMs, stepMs),
    // Date identity is unstable across parent renders; key on the instant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepAnchor?.getTime(), stepPhaseMs, stepMs]);

  /**
   * Both step destinations, resolved synchronously — from the pushed frames
   * inside the index, from the lattice beyond it. Never fetches.
   */
  const stepTargets = useMemo(() => {
    const preview = (direction: StepDirection) => {
      const from = sequenceCursor(s.stepCursor, s.selectedStartDateTime);
      const { start, end, resolvedBy } = stepSelection(
        from, stepMs, direction, s.selectedDuration, stepLattice, positions);
      return { from, start, end, resolvedBy, blocked: isStepBlocked(start, end, direction, selectableRange) };
    };
    return { backward: preview(-1), forward: preview(1) };
  }, [s.stepCursor, s.selectedStartDateTime, s.selectedDuration, stepMs, stepLattice,
    positions, selectableRange]);

  const requestStep = useCallback((direction: StepDirection) => {
    const { from, start, resolvedBy, blocked } =
      direction === 1 ? stepTargets.forward : stepTargets.backward;

    onStepRequest?.({
      direction,
      from: DateTime.toDate(from),
      to: blocked ? null : DateTime.toDate(start),
      resolvedBy,
    });
    if (blocked) return;

    d(SetSelectedStartDateTime({
      selectedStartDateTime: start,
      updateSource: UpdateSource.Step
    }));
  }, [stepTargets, onStepRequest]);

  const themeClass = useMemo(() => theme === AppTheme.Dark ? 'dark-theme' : 'light-theme', [theme]);

  /**
   * Render horizontal calendar with appropriate ranges
   *
   * primaryRange ALWAYS represents the current selection (selectedStartDateTime/selectedDuration)
   * limitedRange (optional) provides animation bounds that constrain primaryRange
   */
  const primaryRangeSetCallback = useCallback((r: {
    start?: DateTime.DateTime;
    end?: DateTime.DateTime;
  }) => {
    if (r.start) {
      d(SetSelectedStartDateTime(
        { selectedStartDateTime: r.start, updateSource: UpdateSource.UserInteraction }));
    }
    if (r.end) {
      const start = r.start || s.selectedStartDateTime;
      const newDuration = DateTime.distanceDuration(start, r.end);
      d(SetSelectedDuration({ selectedDuration: newDuration, updateSource: UpdateSource.UserInteraction }));
    }
  }, [s.selectedStartDateTime]);

  const primaryRangeHC = useMemo(() => ({
    start: s.selectedStartDateTime,
    end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
    set: primaryRangeSetCallback,
    duration: s.selectedDuration
  }), [s.selectedStartDateTime, s.selectedDuration, primaryRangeSetCallback]);

  const limitedRangeSetCallback = useCallback((r: {
    start?: DateTime.DateTime;
    end?: DateTime.DateTime;
  }) => {
    // Enforce the selectable range on the animation bounds
    const maxAllowedDateTime = selectableRange?.max;
    const minAllowedDateTime = selectableRange?.min;

    if (r.start) {
      let newStart = r.start;

      // Constrain start to not go before minimum
      if (minAllowedDateTime && DateTime.lessThan(newStart, minAllowedDateTime)) {
        newStart = minAllowedDateTime;
      }

      // If setting start would push end past limit, constrain it
      if (maxAllowedDateTime) {
        const proposedEnd = DateTime.addDuration(newStart, s.animationDuration);
        if (DateTime.greaterThan(proposedEnd, maxAllowedDateTime)) {
          newStart = DateTime.subtractDuration(maxAllowedDateTime, s.animationDuration);
        }
      }

      d(SetAnimationStartDateTime({ animationStartDateTime: newStart }));
    }

    if (r.end) {
      const start = r.start || s.animationStartDateTime;
      let newEnd = r.end;

      // Constrain end to not exceed limit
      if (maxAllowedDateTime && DateTime.greaterThan(newEnd, maxAllowedDateTime)) {
        newEnd = maxAllowedDateTime;
      }

      const newDuration = DateTime.distanceDuration(start, newEnd);
      d(SetAnimationDuration({ animationDuration: newDuration }));
    }
  }, [s.animationDuration, s.animationStartDateTime, selectableRange]);

  const limitedRangeHC = useMemo(() => {
    if (s.animationOrStepMode === AnimationOrStepMode.Animation) {
      return {
        start: s.animationStartDateTime,
        end: DateTime.addDuration(s.animationStartDateTime, s.animationDuration),
        set: limitedRangeSetCallback,
        duration: s.animationDuration
      };
    }
    return undefined;
  }, [s.animationOrStepMode, s.animationStartDateTime, s.animationDuration, limitedRangeSetCallback]);

  const viewRangeHC = useMemo(() => ({
    start: s.viewStartDateTime,
    end: DateTime.addDuration(s.viewStartDateTime, s.viewDuration)
  }), [s.viewStartDateTime, s.viewDuration]);


  return (
    <TimeZoneDisplayProvider>
      <div className={`time-range-slider-theme-wrapper ${themeClass}`}>
        <div ref={containerRef} className={`${className} time-range-slider${isSliderHidden ? ' slider-hidden' : ''}`}>
          {!isSliderHidden && (
            <PrevDateButton onClick={() => {
              const newStart = DateTime.subtractDuration(
                s.viewStartDateTime, Duration.minutes(35));
              d(SetViewStartDateTime({ viewStartDateTime: newStart }));
            }} />
          )}
          <div ref={sliderRef} className={"horizontal-calendar-grid-body"} style={isSliderHidden ? { display: 'none' } : undefined}>
            <HorizontalCalendar
              primaryRange={primaryRangeHC}
              limitedRange={limitedRangeHC}
              viewRange={viewRangeHC}
              earliestValidDateTime={selectableRange?.min}
              latestValidDateTime={selectableRange?.max}
              timeZone={s.timeZone}
              increment={s.increment}
              theme={theme}
            />
          </div>
          {!isSliderHidden && (
            <NextDateButton onClick={() => {
              const newStart = DateTime.addDuration(
                s.viewStartDateTime, Duration.minutes(35));
              d(SetViewStartDateTime({ viewStartDateTime: newStart }));
            }} />
          )}

          {/* Navigation buttons - only shown when slider is visible */}
          {!isSliderHidden && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              marginLeft: '8px',
              marginRight: '8px'
            }}>
              <Tooltip title="Jump to selected date">
                <IconButton
                  size="small"
                  onClick={() => {
                    const optimalViewStart = calculateOptimalViewStart(
                      s.viewStartDateTime,
                      s.selectedStartDateTime,
                      s.selectedDuration,
                      s.viewStartDateTime,
                      s.viewDuration
                    );
                    d(SetViewStartDateTime({ viewStartDateTime: optimalViewStart }));
                  }}
                  sx={{
                    padding: '4px',
                    color: theme === AppTheme.Dark ? '#4a9eff' : '#0076d6',
                    '&:hover': {
                      backgroundColor: theme === AppTheme.Dark ? 'rgba(74, 158, 255, 0.1)' : 'rgba(0, 118, 214, 0.1)',
                    }
                  }}
                >
                  <MdMyLocation size={18} />
                </IconButton>
              </Tooltip>

              {getLatestDateRange && (
                <Tooltip title={s.isTrackingLatest ? "Tracking latest - click to disable" : "Track latest automatically"}>
                  <IconButton
                    size="small"
                    onClick={async () => {
                      if (s.isTrackingLatest) {
                        // Disable tracking
                        d(SetTrackingLatest({ isTrackingLatest: false }));
                      } else {
                        // Enable tracking - first jump to latest, then enable polling
                        try {
                          const latestDate = await getLatestDateRange();
                          const latestDateTime = DateTime.unsafeFromDate(latestDate);

                          // Enable first: this also ends any step sequence, so the
                          // jump-to-latest writes below are not refused as re-bases.
                          d(SetTrackingLatest({ isTrackingLatest: true }));

                          if (s.animationOrStepMode === AnimationOrStepMode.Animation) {
                            // In animation mode: position animation range to end at latest date
                            // and move primary range to start of animation range
                            const newAnimationStart = DateTime.subtractDuration(latestDateTime, s.animationDuration);
                            d(SetAnimationStartDateTime({ animationStartDateTime: newAnimationStart }));
                            d(SetSelectedStartDateTime({
                              selectedStartDateTime: newAnimationStart,
                              updateSource: UpdateSource.TrackLatestUpdate
                            }));

                            // Update view to show the animation range
                            const optimalViewStart = calculateOptimalViewStart(
                              s.viewStartDateTime,
                              newAnimationStart,
                              s.animationDuration,
                              s.viewStartDateTime,
                              s.viewDuration
                            );
                            d(SetViewStartDateTime({ viewStartDateTime: optimalViewStart }));

                            // Pause animation when enabling tracking (mutually exclusive)
                            if (s.animationPlayMode === PlayMode.Play) {
                              d(SetAnimationPlayMode({ playMode: PlayMode.Pause }));
                            }
                          } else {
                            // In step mode: move selected range to latest date
                            const newSelectedStart = DateTime.subtractDuration(latestDateTime, s.selectedDuration);
                            d(SetSelectedStartDateTime({
                              selectedStartDateTime: newSelectedStart,
                              updateSource: UpdateSource.TrackLatestUpdate
                            }));

                            // Update view to show the selected range
                            const optimalViewStart = calculateOptimalViewStart(
                              s.viewStartDateTime,
                              newSelectedStart,
                              s.selectedDuration,
                              s.viewStartDateTime,
                              s.viewDuration
                            );
                            d(SetViewStartDateTime({ viewStartDateTime: optimalViewStart }));
                          }
                        } catch (error) {
                          console.error('Failed to enable track latest:', error);
                        }
                      }
                    }}
                    sx={{
                      padding: '4px',
                      color: s.isTrackingLatest
                        ? '#4caf50'  // Green when tracking
                        : (theme === AppTheme.Dark ? '#4a9eff' : '#0076d6'),
                      backgroundColor: s.isTrackingLatest
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: s.isTrackingLatest
                          ? 'rgba(76, 175, 80, 0.2)'
                          : (theme === AppTheme.Dark ? 'rgba(74, 158, 255, 0.1)' : 'rgba(0, 118, 214, 0.1)'),
                      }
                    }}
                  >
                    <MdFastForward size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          )}

          {!hideDatePicker && (
            <>
              <DateAndRangeSelect
                startDateTime={s.selectedStartDateTime}
                setStartDateTime={(date: DateTime.DateTime) => {
                  // In animation mode, adjust animation range if new date falls outside it
                  if (s.animationOrStepMode === AnimationOrStepMode.Animation) {
                    const selectedEnd = DateTime.addDuration(date, s.selectedDuration);
                    const animationEnd = DateTime.addDuration(s.animationStartDateTime, s.animationDuration);

                    // Check if selected range falls outside animation bounds
                    const startsBeforeAnimation = DateTime.lessThan(date, s.animationStartDateTime);
                    const endsAfterAnimation = DateTime.greaterThan(selectedEnd, animationEnd);

                    if (startsBeforeAnimation || endsAfterAnimation) {
                      // Expand animation range to include the new selection
                      let newAnimationStart = s.animationStartDateTime;
                      let newAnimationEnd = animationEnd;

                      if (startsBeforeAnimation) {
                        newAnimationStart = date;
                      }
                      if (endsAfterAnimation) {
                        newAnimationEnd = selectedEnd;
                      }

                      const maxAllowedDateTime = selectableRange?.max;
                      const minAllowedDateTime = selectableRange?.min;

                      if (maxAllowedDateTime && DateTime.greaterThan(newAnimationEnd, maxAllowedDateTime)) {
                        newAnimationEnd = maxAllowedDateTime;
                      }
                      if (minAllowedDateTime && DateTime.lessThan(newAnimationStart, minAllowedDateTime)) {
                        newAnimationStart = minAllowedDateTime;
                      }

                      const newAnimationDuration = DateTime.distanceDuration(newAnimationStart, newAnimationEnd);
                      d(SetAnimationStartDateTime({ animationStartDateTime: newAnimationStart }));
                      d(SetAnimationDuration({ animationDuration: newAnimationDuration }));
                    }
                  }

                  d(SetSelectedStartDateTime({
                    selectedStartDateTime: date,
                    updateSource: UpdateSource.UserInteraction
                  }));
                }}
                returnToDefaultDateTime={() => {
                  d(ResetAll());
                }}
                timeZone={s.timeZone}
                onTimeZoneChange={(tz: TimeZone) => d(SetTimeZone({ timeZone: tz }))}
                rangeValue={TimeDuration[Duration.toMillis(s.selectedDuration)]
                  ? Duration.toMillis(s.selectedDuration) as TimeDuration : undefined}
                setRange={
                  (timeDuration: TimeDuration) =>
                    d(SetSelectedDuration({
                      selectedDuration: Duration.millis(timeDuration),
                      updateSource: UpdateSource.UserInteraction
                    }))
                }
                availableDateRange={availableDateRange}
              />
              <Divider variant="middle" orientation={"vertical"} flexItem />
            </>
          )}
          <AnimateAndStepControls
            /* Step controls */
            incrementStartDateTime={() => requestStep(1)}
            decrementStartDateTime={() => requestStep(-1)}
            disableStepForward={stepTargets.forward.blocked}
            disableStepBackward={stepTargets.backward.blocked}

            /* Feature toggle */
            hideAnimationToggle={hideAnimationToggle}
            disabledAnimationTooltip={disabledAnimationTooltip}

            /* Animation toggle */
            animationEnabled={s.animationOrStepMode === AnimationOrStepMode.Animation}
            setAnimationEnabled={(enabled: boolean) => {
              d(SetAnimationOrStepMode({
                animationOrStepMode: enabled
                  ? AnimationOrStepMode.Animation
                  : AnimationOrStepMode.Step
              }));
              if (enabled) {
                let animationStart = s.selectedStartDateTime;
                let needsStartUpdate = false;

                // Determine max/min constraints
                const maxAllowedDateTime = selectableRange?.max;
                const minAllowedDateTime = selectableRange?.min;

                // Check if animation range would exceed max
                if (maxAllowedDateTime) {
                  const proposedAnimationEnd = DateTime.addDuration(animationStart, s.animationDuration);

                  if (DateTime.greaterThan(proposedAnimationEnd, maxAllowedDateTime)) {
                    // Bump animation back to fit within the acceptable range
                    const adjustedStart = DateTime.subtractDuration(maxAllowedDateTime, s.animationDuration);
                    // Only update if the adjustment is actually different
                    if (DateTime.toEpochMillis(adjustedStart) !== DateTime.toEpochMillis(animationStart)) {
                      animationStart = adjustedStart;
                      needsStartUpdate = true;
                    }
                  }
                }

                // Check if animation start would be before min
                if (minAllowedDateTime && DateTime.lessThan(animationStart, minAllowedDateTime)) {
                  animationStart = minAllowedDateTime;
                  needsStartUpdate = true;
                }

                // Only dispatch if we need to update the start time
                if (needsStartUpdate || DateTime.toEpochMillis(animationStart) !== DateTime.toEpochMillis(s.animationStartDateTime)) {
                  d(SetAnimationStartDateTime({ animationStartDateTime: animationStart }));
                }
                d(SetAnimationPlayMode({ playMode: PlayMode.Play }));

                // Disable tracking when starting animation (mutually exclusive)
                if (s.isTrackingLatest) {
                  d(SetTrackingLatest({ isTrackingLatest: false }));
                }
              }
            }}

            /* Play toggle */
            playMode={s.animationPlayMode}
            setPlayMode={(mode: PlayMode) => {
              d(SetAnimationPlayMode({ playMode: mode }));
              // Disable tracking when starting animation play (mutually exclusive)
              if (mode === PlayMode.Play && s.isTrackingLatest) {
                d(SetTrackingLatest({ isTrackingLatest: false }));
              }
            }}

            /* Animation speed settings */
            animationSpeed={s.animationSpeed}
            setAnimationSpeed={(speed: AnimationSpeed) => {
              d(SetAnimationSpeed({ animationSpeed: speed }));
            }}
            animationDuration={s.animationDuration}
            setAnimationDuration={(duration: Duration.Duration) => {
              // Determine max/min constraints
              const maxAllowedDateTime = selectableRange?.max;
              const minAllowedDateTime = selectableRange?.min;

              // Check if new duration would cause animation to exceed constraints
              if (s.animationOrStepMode === AnimationOrStepMode.Animation) {
                let adjustedStart = s.animationStartDateTime;

                if (maxAllowedDateTime) {
                  const proposedAnimationEnd = DateTime.addDuration(adjustedStart, duration);
                  if (DateTime.greaterThan(proposedAnimationEnd, maxAllowedDateTime)) {
                    // Adjust animation start to accommodate the new duration
                    adjustedStart = DateTime.subtractDuration(maxAllowedDateTime, duration);
                  }
                }

                // Ensure adjusted start doesn't go before minimum
                if (minAllowedDateTime && DateTime.lessThan(adjustedStart, minAllowedDateTime)) {
                  adjustedStart = minAllowedDateTime;
                }

                if (DateTime.toEpochMillis(adjustedStart) !== DateTime.toEpochMillis(s.animationStartDateTime)) {
                  d(SetAnimationStartDateTime({ animationStartDateTime: adjustedStart }));
                }
              }

              d(SetAnimationDuration({ animationDuration: duration }));
            }}
            incrementAnimationSpeed={() => {
              const animationSpeed = s.animationSpeed;
              const newSpeed = match(animationSpeed)
                .with(AnimationSpeed['-1 hour/sec'], () => AnimationSpeed['-30 min/sec'])
                .with(AnimationSpeed['-30 min/sec'], () => AnimationSpeed['-10 min/sec'])
                .with(AnimationSpeed['-10 min/sec'], () => AnimationSpeed['-5 min/sec'])
                .with(AnimationSpeed['-5 min/sec'], () => AnimationSpeed['-1 min/sec'])
                .with(AnimationSpeed['1 min/sec'], () => AnimationSpeed['5 min/sec'])
                .with(AnimationSpeed['5 min/sec'], () => AnimationSpeed['10 min/sec'])
                .with(AnimationSpeed['10 min/sec'], () => AnimationSpeed['30 min/sec'])
                .with(AnimationSpeed['30 min/sec'], () => AnimationSpeed['1 hour/sec'])
                .with(AnimationSpeed['1 hour/sec'], () => AnimationSpeed['1 min/sec'])
                .otherwise(() => animationSpeed);
              d(SetAnimationSpeed({ animationSpeed: newSpeed }));
            }}
            decrementAnimationSpeed={() => {
              const animationSpeed = s.animationSpeed;
              const newSpeed = match(animationSpeed)
                .with(AnimationSpeed['1 hour/sec'], () => AnimationSpeed['30 min/sec'])
                .with(AnimationSpeed['30 min/sec'], () => AnimationSpeed['10 min/sec'])
                .with(AnimationSpeed['10 min/sec'], () => AnimationSpeed['5 min/sec'])
                .with(AnimationSpeed['5 min/sec'], () => AnimationSpeed['1 min/sec'])
                .with(AnimationSpeed['1 min/sec'], () => AnimationSpeed['-1 min/sec'])
                .with(AnimationSpeed['-1 min/sec'], () => AnimationSpeed['-5 min/sec'])
                .with(AnimationSpeed['-5 min/sec'], () => AnimationSpeed['-10 min/sec'])
                .with(AnimationSpeed['-10 min/sec'], () => AnimationSpeed['-30 min/sec'])
                .with(AnimationSpeed['-30 min/sec'], () => AnimationSpeed['-1 hour/sec'])
                .with(AnimationSpeed['-1 hour/sec'], () => AnimationSpeed['-1 min/sec'])
                .otherwise(() => animationSpeed);
              d(SetAnimationSpeed({ animationSpeed: newSpeed }));
            }}
          />
        </div>
      </div>
    </TimeZoneDisplayProvider>
  );
}
