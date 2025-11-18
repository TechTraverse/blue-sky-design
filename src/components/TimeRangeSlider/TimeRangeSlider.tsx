import './timeRangeSlider.css';
import { useEffect, useReducer, useRef, useMemo, useCallback } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Data as D, Duration } from 'effect';
import { PrevDateButton, NextDateButton } from "./NewArrowButtons";
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';
import { AnimateAndStepControls } from './AnimateAndStepControls';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, Theme as AppTheme, TimeZone } from './timeSliderTypes';
import { DateAndRangeSelect } from './DateAndRangeSelect';
import { Divider, IconButton, Tooltip } from '@mui/material';
import { MdMyLocation, MdFastForward } from 'react-icons/md';
import { TimeZoneDisplayProvider } from '../../contexts/TimeZoneDisplayContext';

/**
 * Local types for state, actions, and props
 */

export interface TimeRangeSliderProps {
  dateRange?: RangeValue<Date>;
  dateRangeForReset?: RangeValue<Date>;
  onDateRangeSelect: (rv: RangeValue<Date>) => void;
  getLatestDateRange?: () => Promise<Date>;
  animationRequestFrequency?: AnimationRequestFrequency;
  className?: string;
  theme?: AppTheme;
  timeZone?: TimeZone;
  onTimeZoneChange?: (timeZone: TimeZone) => void;
  increment?: TimeDuration;
  hideAnimationToggle?: boolean;
}

enum UpdateSource {
  ExternalProp,
  UserInteraction
}

type State = {
  timeZone: TimeZone;
  increment: TimeDuration;
  // The current viewable range of dates
  viewStartDateTime: DateTime.DateTime;
  viewDuration: Duration.Duration;

  // Default date and duration to reset to
  resetStartDateTime: DateTime.DateTime;
  resetDuration: Duration.Duration;

  // User-selected date range
  selectedStartDateTime: DateTime.DateTime;
  selectedDuration: Duration.Duration;

  // Two modes: animation or step
  animationOrStepMode: AnimationOrStepMode;

  // Animation state for the calendar
  resetAnimationSpeed: AnimationSpeed;
  resetAnimationDuration: Duration.Duration;
  animationStartDateTime: DateTime.DateTime;
  animationDuration: Duration.Duration;
  animationRequestFrequency: AnimationRequestFrequency;
  animationPlayMode: PlayMode;
  animationSpeed: AnimationSpeed;
};

/**
 * Actions for reducer
 */

type Action = D.TaggedEnum<{
  SetTimeZone: { timeZone: TimeZone; };
  ExtSetTimeZone: { timeZone: TimeZone; };
  SetIncrement: { increment: TimeDuration; };
  ExtSetIncrement: { increment: TimeDuration; };

  SetViewStartDateTime: { viewStartDateTime: DateTime.DateTime; };
  SetViewDuration: { viewDuration: Duration.Duration; };

  SetResetStartDateTime:
  { resetStartDateTime: DateTime.DateTime; };
  SetResetDuration: { resetDuration: Duration.Duration; };

  ExtSetSelectedStartDateTime: {
    selectedStartDateTime: DateTime.DateTime;
    updateSource: UpdateSource;
  };
  SetSelectedStartDateTime: {
    selectedStartDateTime: DateTime.DateTime;
    updateSource: UpdateSource;
  };
  SetSelectedDuration: {
    selectedDuration: Duration.Duration;
    updateSource: UpdateSource;
  };
  ExtSetSelectedDuration: {
    selectedDuration: Duration.Duration;
    updateSource: UpdateSource;
  };

  SetAnimationOrStepMode:
  { animationOrStepMode: AnimationOrStepMode; };

  SetAnimationStartDateTime:
  { animationStartDateTime: DateTime.DateTime; };
  SetAnimationDuration: { animationDuration: Duration.Duration; };
  SetAnimationRequestFrequency:
  { animationRequestFrequency: AnimationRequestFrequency; };
  SetAnimationPlayMode: { playMode: PlayMode; };
  SetAnimationSpeed:
  { animationSpeed: AnimationSpeed; };
  SetResetAnimationSpeed:
  { resetAnimationSpeed: AnimationSpeed; };

  ResetAll: {};
}>;

const {
  $match: $actionMatch,

  SetTimeZone,
  ExtSetTimeZone,
  SetIncrement,
  ExtSetIncrement,
  SetViewStartDateTime,
  SetViewDuration,

  SetResetStartDateTime,
  SetResetDuration,

  SetSelectedStartDateTime,
  ExtSetSelectedStartDateTime,
  SetSelectedDuration,
  ExtSetSelectedDuration,

  SetAnimationOrStepMode,

  SetAnimationStartDateTime,
  SetAnimationDuration,
  SetAnimationRequestFrequency,
  SetAnimationPlayMode,
  SetAnimationSpeed,
  SetResetAnimationSpeed,
  ResetAll } = D.taggedEnum<Action>();


/**
 * Constants
 */

const DEFAULT_ANIMATION_DURATION = Duration.hours(2);


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

const calculateOptimalViewStart = (
  _pStart: DateTime.DateTime,
  nStart: DateTime.DateTime,
  nDuration: Duration.Duration,
  cViewStart: DateTime.DateTime,
  cViewDuration: Duration.Duration,
  roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime
): DateTime.DateTime => {
  // Check if new selection is outside current view
  const nEnd = DateTime.addDuration(nStart, nDuration);
  const cViewEnd = DateTime.addDuration(cViewStart, cViewDuration);
  const isOutsideView = DateTime.lessThan(nStart, cViewStart) || DateTime.greaterThan(nEnd, cViewEnd);

  if (isOutsideView) {
    // Center the selection in the view
    const selectionMidpoint = DateTime.addDuration(nStart, Duration.millis(Duration.toMillis(nDuration) / 2));
    const unroundedViewStart = DateTime.subtractDuration(selectionMidpoint, Duration.millis(Duration.toMillis(cViewDuration) / 2));
    return roundingFn(unroundedViewStart);
  }

  // Selection is within view, keep current view
  return cViewStart;
};

/**
 * State management: reducer
 */

const getSetSelectedStartDateTimeAction = (state: State, roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime) => (x: {
  selectedStartDateTime: DateTime.DateTime;
  updateSource: UpdateSource;
}) => {
  const start = x.selectedStartDateTime;

  // Calculate optimal view range with 5-minute alignment and padding
  const optimalViewStart = calculateOptimalViewStart(
    state.selectedStartDateTime, // Old start
    start,
    state.selectedDuration,
    state.viewStartDateTime,
    state.viewDuration,
    roundingFn
  );

  // Only update view range if selected date + duration goes outside current view range
  // Check if the selection is outside the current view
  const selectedEnd = DateTime.addDuration(start, state.selectedDuration);
  const currentViewEnd = DateTime.addDuration(state.viewStartDateTime, state.viewDuration);

  const selectionStartOutsideView = DateTime.lessThan(start, state.viewStartDateTime);
  const selectionEndOutsideView = DateTime.greaterThan(selectedEnd, currentViewEnd);

  // Only adjust view if selection is actually outside the current view
  const viewStartDateTime = (selectionStartOutsideView || selectionEndOutsideView)
    ? optimalViewStart
    : state.viewStartDateTime;

  return {
    ...state,
    viewStartDateTime,
    selectedStartDateTime: start,
  }
}

const getSetSelectedDurationAction = (state: State, roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime) => (x: {
  selectedDuration: Duration.Duration;
  updateSource: UpdateSource;
}) => {
  // Calculate optimal view range with new duration
  const viewStartDateTime = calculateOptimalViewStart(
    state.selectedStartDateTime,
    state.selectedStartDateTime,
    x.selectedDuration,
    state.viewStartDateTime,
    state.viewDuration,
    roundingFn
  );

  return {
    ...state,
    viewStartDateTime,
    selectedDuration: x.selectedDuration,
  };
}

const reducer = (state: State, action: Action, roundingFn?: (dateTime: DateTime.DateTime) => DateTime.DateTime): State => {
  // Default rounding function for 5-minute increments
  const defaultRounding = (dateTime: DateTime.DateTime): DateTime.DateTime => dateTime.pipe(
    DateTime.toParts,
    (parts) => {
      const roundedToFiveFloorMins = Math.floor(parts.minutes / 5) * 5;
      return DateTime.unsafeMake({
        ...parts,
        minutes: roundedToFiveFloorMins,
        seconds: 0,
        milliseconds: 0,
      });
    });

  const actualRoundingFn = roundingFn || defaultRounding;

  return $actionMatch({
    SetTimeZone: (x) => {

      return {
        ...state,
        timeZone: x.timeZone,
      }
    },
    ExtSetTimeZone: (x) => ({
      ...state,
      timeZone: x.timeZone,
    }),
    SetIncrement: (x) => ({
      ...state,
      increment: x.increment,
    }),
    ExtSetIncrement: (x) => ({
      ...state,
      increment: x.increment,
    }),

    SetViewStartDateTime: (x) => ({
      ...state,
      viewStartDateTime:
        actualRoundingFn(x.viewStartDateTime),
    }),
    SetViewDuration: (x) => ({
      ...state,
      viewDuration: x.viewDuration,
    }),

    SetResetStartDateTime: (x) => ({
      ...state,
      resetStartDateTime: x.resetStartDateTime,
    }),
    SetResetDuration: (x) => ({
      ...state,
      resetDuration: x.resetDuration,
    }),

    SetSelectedStartDateTime: getSetSelectedStartDateTimeAction(state, actualRoundingFn),
    ExtSetSelectedStartDateTime: getSetSelectedStartDateTimeAction(state, actualRoundingFn),

    SetSelectedDuration: getSetSelectedDurationAction(state, actualRoundingFn),
    ExtSetSelectedDuration: getSetSelectedDurationAction(state, actualRoundingFn),

    SetAnimationOrStepMode: (x) => ({
      ...state,
      animationOrStepMode: x.animationOrStepMode,
    }),

    SetAnimationStartDateTime: (x) => ({
      ...state,
      animationStartDateTime: x.animationStartDateTime,
    }),
    SetAnimationDuration: (x) => ({
      ...state,
      animationDuration: x.animationDuration,
    }),
    SetAnimationRequestFrequency: (x) => ({
      ...state,
      animationRequestFrequency: x.animationRequestFrequency,
    }),
    SetAnimationPlayMode: (x) => ({
      ...state,
      animationPlayMode: x.playMode,
    }),
    SetAnimationSpeed: (x) => ({
      ...state,
      animationSpeed: x.animationSpeed,
    }),
    SetResetAnimationSpeed: (x) => ({
      ...state,
      resetAnimationSpeed: x.resetAnimationSpeed,
    }),

    ResetAll: () => ({
      ...state,
      viewStartDateTime: state.resetStartDateTime,
      viewDuration: state.resetDuration,
      selectedStartDateTime: state.resetStartDateTime,
      selectedDuration: state.resetDuration,
      animationOrStepMode: AnimationOrStepMode.Step,
      animationDuration: state.resetAnimationDuration,
      animationPlayMode: PlayMode.Pause,
      animationSpeed: state.resetAnimationSpeed,
    }),
  })(action);
}


/**
 * Middleware for executing external side-effects
 */

function withMiddleware(
  reducer: (state: State, action: Action, roundingFn?: (dateTime: DateTime.DateTime) => DateTime.DateTime) => State,
  onDateRangeSelect: (rv: RangeValue<Date>) => void,
  roundingFn: (dateTime: DateTime.DateTime) => DateTime.DateTime,
  onTimeZoneChange?: (timeZone: TimeZone) => void
): (state: State, action: Action) => State {
  return (oldState, action) => {

    // Determine latest state
    const newState = reducer(oldState, action, roundingFn);

    // Handle callbacks
    match(action._tag)
      .with(P.union("SetSelectedStartDateTime", "SetSelectedDuration"), () => {
        const start = newState.selectedStartDateTime;
        const end = DateTime.addDuration(start, newState.selectedDuration);

        const startChanged = DateTime.distance(oldState.selectedStartDateTime, newState.selectedStartDateTime) !== 0;
        const durationChanged = Duration.toMillis(oldState.selectedDuration) !== Duration.toMillis(newState.selectedDuration);

        if (startChanged || durationChanged) {
          onDateRangeSelect({
            start: DateTime.toDate(start),
            end: DateTime.toDate(end)
          });
        }
      })
      .with("SetTimeZone", () => (newState.timeZone !== oldState.timeZone),
        () => onTimeZoneChange?.(newState.timeZone)
      )
    return newState;
  };
}


/**
 * Exported component
 */

export const TimeRangeSlider = ({
  dateRange,
  dateRangeForReset,
  onDateRangeSelect,
  getLatestDateRange,
  animationRequestFrequency = AnimationRequestFrequency['1 fps'],
  className = "",
  theme = AppTheme.Light,
  timeZone = TimeZone.Local,
  onTimeZoneChange,
  increment = TimeDuration["5m"],
  hideAnimationToggle = false,
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

      animationOrStepMode,

      resetAnimationSpeed,
      resetAnimationDuration,
      animationStartDateTime,
      animationDuration,
      animationRequestFrequency,
      animationPlayMode,
      animationSpeed,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [s, d] = useReducer(withMiddleware(reducer, onDateRangeSelect, roundDateTimeDownToNearestIncrement, onTimeZoneChange), null, () => initialValues);


  /**
   * Set up observer to update view duration based on the width of the slider
   */
  // Ref to access current state in delayed animation actions
  const stateRef = useRef(s);
  stateRef.current = s;

  const sliderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const viewDuration = widthToDuration(width);

        // Only dispatch if duration actually changed
        if (Duration.toMillis(viewDuration) !== Duration.toMillis(stateRef.current.viewDuration)) {
          d(SetViewDuration({ viewDuration }));
        }
      }
    });

    if (sliderRef.current) {
      resizeObserver.observe(sliderRef.current);
    }

    return () => {
      if (sliderRef.current) {
        resizeObserver.unobserve(sliderRef.current);
      }
    };
  }, []);

  /**
   * Ensure limited range (animation range) is initially centered in view
   * Debounced to prevent excessive centering during rapid state changes
   */
  const lastCenteringRef = useRef<number>(0);
  const centeringTimeoutRef = useRef<NodeJS.Timeout>();
  
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
   * Animation auto-increment logic
   * Automatically advances the selection when in Animation mode and playing
   */
  useEffect(() => {
    if (s.animationOrStepMode !== AnimationOrStepMode.Animation || 
        s.animationPlayMode !== PlayMode.Play) {
      return;
    }

    // Calculate milliseconds to advance per animation frame
    const animationSpeed = s.animationSpeed; // ms of simulated time per real second
    const frameMs = animationRequestFrequency; // ms per frame
    const advanceMs = (animationSpeed * frameMs) / 1000; // ms to advance per frame

    const intervalId = setInterval(() => {
      const currentState = stateRef.current;
      const newStart = DateTime.addDuration(
        currentState.selectedStartDateTime,
        Duration.millis(advanceMs)
      );
      const newEnd = DateTime.addDuration(newStart, currentState.selectedDuration);
      const animationEnd = DateTime.addDuration(
        currentState.animationStartDateTime,
        currentState.animationDuration
      );

      // Check if we've reached the end of the animation range
      if (DateTime.greaterThan(newEnd, animationEnd)) {
        // Loop back to the start
        const newLoopStart = currentState.animationStartDateTime;
        d(SetSelectedStartDateTime({
          selectedStartDateTime: newLoopStart,
          updateSource: UpdateSource.UserInteraction
        }));
      } else {
        // Normal increment
        d(SetSelectedStartDateTime({
          selectedStartDateTime: newStart,
          updateSource: UpdateSource.UserInteraction
        }));
      }
    }, frameMs);

    return () => clearInterval(intervalId);
  }, [s.animationOrStepMode, s.animationPlayMode, s.animationSpeed, 
      animationRequestFrequency, s.animationStartDateTime, s.animationDuration]);

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
    // Enforce latestValidDateTime constraint
    const maxAllowedDateTime = dateRangeForReset 
      ? DateTime.unsafeFromDate(dateRangeForReset.start)
      : undefined;

    if (r.start) {
      let newStart = r.start;
      
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
  }, [s.animationDuration, s.animationStartDateTime, dateRangeForReset]);

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
        <div className={`${className} time-range-slider`}>
          <PrevDateButton onClick={() => {
            const newStart = DateTime.subtractDuration(
              s.viewStartDateTime, Duration.hours(1));
            d(SetViewStartDateTime({ viewStartDateTime: newStart }));
          }} />
          <div ref={sliderRef} className={"horizontal-calendar-grid-body"} >
            <HorizontalCalendar
              primaryRange={primaryRangeHC}
              limitedRange={limitedRangeHC}
              viewRange={viewRangeHC}
              latestValidDateTime={
                dateRangeForReset
                  ? DateTime.unsafeFromDate(dateRangeForReset.start)
                  : undefined
              }
              timeZone={s.timeZone}
              increment={s.increment}
              theme={theme}
            />
          </div>
          <NextDateButton onClick={() => {
            const newStart = DateTime.addDuration(
              s.viewStartDateTime, Duration.hours(1));
            d(SetViewStartDateTime({ viewStartDateTime: newStart }));
          }} />
          
          {/* Navigation buttons */}
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
            
            {(dateRangeForReset || getLatestDateRange) && (
              <Tooltip title="Jump to latest available date">
                <IconButton
                  size="small"
                  onClick={async () => {
                    const latestDateTime = await match({ getLatestDateRange, dateRangeForReset })
                      .with({ getLatestDateRange: P.not(P.nullish) }, async ({ getLatestDateRange }) => {
                        try {
                          const latestDate = await getLatestDateRange();
                          return DateTime.unsafeFromDate(latestDate);
                        } catch (error) {
                          console.error('Failed to get latest date range:', error);
                          return match(dateRangeForReset)
                            .with(P.not(P.nullish), (dateRange) => DateTime.unsafeFromDate(dateRange.start))
                            .otherwise(() => null);
                        }
                      })
                      .with({ dateRangeForReset: P.not(P.nullish) }, ({ dateRangeForReset }) => 
                        Promise.resolve(DateTime.unsafeFromDate(dateRangeForReset.start))
                      )
                      .otherwise(() => Promise.resolve(null));
                    
                    if (!latestDateTime) return;
                    
                    if (s.animationOrStepMode === AnimationOrStepMode.Animation) {
                      // In animation mode: position animation range to end at latest date
                      // and move primary range to start of animation range
                      const newAnimationStart = DateTime.subtractDuration(latestDateTime, s.animationDuration);
                      d(SetAnimationStartDateTime({ animationStartDateTime: newAnimationStart }));
                      d(SetSelectedStartDateTime({
                        selectedStartDateTime: newAnimationStart,
                        updateSource: UpdateSource.UserInteraction
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
                    } else {
                      // In step mode: move selected range to latest date
                      // Calculate the start time so the range ends at latest date
                      const newSelectedStart = DateTime.subtractDuration(latestDateTime, s.selectedDuration);
                      d(SetSelectedStartDateTime({
                        selectedStartDateTime: newSelectedStart,
                        updateSource: UpdateSource.UserInteraction
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
                  }}
                  sx={{
                    padding: '4px',
                    color: theme === AppTheme.Dark ? '#4a9eff' : '#0076d6',
                    '&:hover': {
                      backgroundColor: theme === AppTheme.Dark ? 'rgba(74, 158, 255, 0.1)' : 'rgba(0, 118, 214, 0.1)',
                    }
                  }}
                >
                  <MdFastForward size={18} />
                </IconButton>
              </Tooltip>
            )}
          </div>
          
          <DateAndRangeSelect
            startDateTime={s.selectedStartDateTime}
            setStartDateTime={(date: DateTime.DateTime) => {
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
            dateRangeForReset={dateRangeForReset}
          />
          <Divider variant="middle" orientation={"vertical"} flexItem />
          <AnimateAndStepControls
            /* Step controls */
            incrementStartDateTime={() => {
              const newStartDateTime = DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration);
              const newEndDateTime = DateTime.addDuration(newStartDateTime, s.selectedDuration);

              // Check if the new end time would exceed dateRangeForReset
              if (dateRangeForReset) {
                const maxAllowedDateTime = DateTime.unsafeFromDate(dateRangeForReset.start);
                if (DateTime.greaterThan(newEndDateTime, maxAllowedDateTime)) {
                  return; // Don't increment if it would exceed the limit
                }
              }

              d(SetSelectedStartDateTime({
                selectedStartDateTime: newStartDateTime,
                updateSource: UpdateSource.UserInteraction
              }));
            }}
            decrementStartDateTime={() => {
              const newStartDateTime = DateTime.subtractDuration(s.selectedStartDateTime, s.selectedDuration);

              // Decrementing should generally be allowed as it moves away from the limit
              // But let's add a sanity check in case the duration is negative
              if (dateRangeForReset) {
                const newEndDateTime = DateTime.addDuration(newStartDateTime, s.selectedDuration);
                const maxAllowedDateTime = DateTime.unsafeFromDate(dateRangeForReset.start);
                if (DateTime.greaterThan(newEndDateTime, maxAllowedDateTime)) {
                  return; // Don't decrement if it would still exceed the limit
                }
              }

              d(SetSelectedStartDateTime({
                selectedStartDateTime: newStartDateTime,
                updateSource: UpdateSource.UserInteraction
              }));
            }}

            /* Feature toggle */
            hideAnimationToggle={hideAnimationToggle}

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

                // Check if animation range would exceed dateRangeForReset
                if (dateRangeForReset) {
                  const maxAllowedDateTime = DateTime.unsafeFromDate(dateRangeForReset.start);
                  const proposedAnimationEnd = DateTime.addDuration(animationStart, s.animationDuration);

                  if (DateTime.greaterThan(proposedAnimationEnd, maxAllowedDateTime)) {
                    // Bump animation back to the latest 2 hours of acceptable dates
                    const adjustedStart = DateTime.subtractDuration(maxAllowedDateTime, s.animationDuration);
                    // Only update if the adjustment is actually different
                    if (DateTime.toEpochMillis(adjustedStart) !== DateTime.toEpochMillis(animationStart)) {
                      animationStart = adjustedStart;
                      needsStartUpdate = true;
                    }
                  }
                }

                // Only dispatch if we need to update the start time
                if (needsStartUpdate || DateTime.toEpochMillis(animationStart) !== DateTime.toEpochMillis(s.animationStartDateTime)) {
                  d(SetAnimationStartDateTime({ animationStartDateTime: animationStart }));
                }
                d(SetAnimationPlayMode({ playMode: PlayMode.Play }));
              }
            }}

            /* Play toggle */
            playMode={s.animationPlayMode}
            setPlayMode={(mode: PlayMode) => {
              d(SetAnimationPlayMode({ playMode: mode }));
            }}

            /* Animation speed settings */
            animationSpeed={s.animationSpeed}
            setAnimationSpeed={(speed: AnimationSpeed) => {
              d(SetAnimationSpeed({ animationSpeed: speed }));
            }}
            animationDuration={s.animationDuration}
            setAnimationDuration={(duration: Duration.Duration) => {
              // Check if new duration would cause animation to exceed dateRangeForReset
              if (dateRangeForReset && s.animationOrStepMode === AnimationOrStepMode.Animation) {
                const maxAllowedDateTime = DateTime.unsafeFromDate(dateRangeForReset.start);
                const proposedAnimationEnd = DateTime.addDuration(s.animationStartDateTime, duration);

                if (DateTime.greaterThan(proposedAnimationEnd, maxAllowedDateTime)) {
                  // Adjust animation start to accommodate the new duration
                  const adjustedStart = DateTime.subtractDuration(maxAllowedDateTime, duration);
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
