import './timeRangeSlider.css';
import { useEffect, useReducer, useRef, useMemo } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Data as D, Duration } from 'effect';
import { PrevDateButton, NextDateButton } from "./NewArrowButtons";
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';
import { AnimateAndStepControls } from './AnimateAndStepControls';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, Theme as AppTheme, TimeZone } from './timeSliderTypes';
import { DateAndRangeSelect } from './DateAndRangeSelect';
import { Divider } from '@mui/material';

/**
 * Local types for state, actions, and props
 */

export interface TimeRangeSliderProps {
  dateRange?: RangeValue<Date>;
  dateRangeForReset?: RangeValue<Date>;
  onDateRangeSelect: (rv: RangeValue<Date>) => void;
  animationRequestFrequency?: AnimationRequestFrequency;
  className?: string;
  theme?: AppTheme;
  timeZone?: TimeZone;
  onTimeZoneChange?: (timeZone: TimeZone) => void;
}

enum UpdateSource {
  ExternalProp,
  UserInteraction
}

type State = {
  timeZone: TimeZone;
  // The current viewable range of dates
  viewStartDateTime: DateTime.DateTime;
  viewDuration: Duration.Duration;

  // Default date and duration to reset to
  resetStartDateTime: DateTime.DateTime;
  resetDuration: Duration.Duration;

  // User-selected date range
  prevSelectedStartDateTime: DateTime.DateTime;
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

  ResetAll: object;
}>;

const {
  $match: $actionMatch,

  SetTimeZone,
  SetViewStartDateTime,
  SetViewDuration,

  SetResetStartDateTime,
  SetResetDuration,

  SetSelectedStartDateTime,
  SetSelectedDuration,

  SetAnimationOrStepMode,

  SetAnimationStartDateTime,
  SetAnimationDuration,
  SetAnimationPlayMode,
  SetAnimationSpeed,
  ResetAll } = D.taggedEnum<Action>();


/**
 * Constants
 */

const DEFAULT_ANIMATION_DURATION = Duration.hours(2);
const DEFAULT_VIEW_INCREMENT = Duration.minutes(5).pipe(Duration.toMillis);


/**
 * Helper functions
 */

const roundDateTimeDownToNearestFiveMinutes = (dateTime: DateTime.DateTime): DateTime.DateTime => dateTime.pipe(
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

const calculateOptimalViewStart = (
  pStart: DateTime.DateTime,
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
    return roundDateTimeDownToNearestFiveMinutes(unroundedViewStart);
  }

  // Selection is within view, keep current view
  return cViewStart;
};

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
 * State management: reducer
 */

const getSetSelectedStartDateTimeAction = (state: State) => (x: {
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
    state.viewDuration
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
    prevSelectedStartDateTime: state.selectedStartDateTime,
    selectedStartDateTime: start,
  }
}

const reducer = (state: State, action: Action): State =>
  $actionMatch({
    SetTimeZone: (x) => ({
      ...state,
      timeZone: x.timeZone,
    }),
    ExtSetTimeZone: (x) => ({
      ...state,
      timeZone: x.timeZone,
    }),

    SetViewStartDateTime: (x) => ({
      ...state,
      viewStartDateTime:
        roundDateTimeDownToNearestFiveMinutes(x.viewStartDateTime),
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

    SetSelectedStartDateTime: getSetSelectedStartDateTimeAction(state),
    ExtSetSelectedStartDateTime: getSetSelectedStartDateTimeAction(state),
    SetSelectedDuration: (x) => {
      // Calculate optimal view range with new duration
      const viewStartDateTime = calculateOptimalViewStart(
        state.selectedStartDateTime,
        state.selectedStartDateTime,
        x.selectedDuration,
        state.viewStartDateTime,
        state.viewDuration
      );

      return {
        ...state,
        viewStartDateTime,
        selectedDuration: x.selectedDuration,
      };
    },

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
      prevSelectedStartDateTime: state.resetStartDateTime,
      selectedStartDateTime: state.resetStartDateTime,
      selectedDuration: state.resetDuration,
      animationOrStepMode: AnimationOrStepMode.Step,
      animationDuration: state.resetAnimationDuration,
      animationPlayMode: PlayMode.Pause,
      animationSpeed: state.resetAnimationSpeed,
    }),
  })(action);


/**
 * Middleware for executing external side-effects
 */

function withMiddleware(
  reducer: (state: State, action: Action) => State,
  onDateRangeSelect: (rv: RangeValue<Date>) => void,
  onTimeZoneChange?: (timeZone: TimeZone) => void
): (state: State, action: Action) => State {
  return (oldState, action) => {
    // Determine latest state
    const newState = reducer(oldState, action);
    match(action._tag)
      .with("SetSelectedStartDateTime", () => {
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
  animationRequestFrequency = AnimationRequestFrequency['1 fps'],
  className = "",
  theme = AppTheme.Light,
  timeZone = TimeZone.Local,
  onTimeZoneChange,
}: TimeRangeSliderProps) => {

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

    // Values for calculating remaining initial state
    const selectedStartDateTime = match(dateRange)
      .with({ start: P.instanceOf(Date) },
        (x) => DateTime.unsafeFromDate(x.start))
      .otherwise(() => {
        console.warn("TimeRangeSlider: dateRange prop is malformed or undefined, defaulting to current time");
        const now = DateTime.unsafeNow().pipe(roundDateTimeDownToNearestFiveMinutes);
        return now;
      });
    const prevSelectedStartDateTime = selectedStartDateTime;
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
      DateTime.subtractDuration(selectedStartDateTime, Duration.hours(2)),
      viewDuration
    );

    return {
      timeZone,
      viewStartDateTime,
      viewDuration,

      resetStartDateTime,
      resetDuration,

      selectedStartDateTime,
      prevSelectedStartDateTime,
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

  const [s, d] = useReducer(withMiddleware(reducer, onDateRangeSelect, onTimeZoneChange), null, () => initialValues);


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
   * Sanitation layer for external prop values
   * Prevents unnecessary state updates from external prop changes
   */

  const sanitizeExternalDateRange = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return null;

    const startTime = dateRange.start.getTime();
    const endTime = dateRange.end.getTime();

    // Don't process if state isn't initialized yet
    if (!stateRef.current?.selectedStartDateTime) {
      console.log('DEBUG: State not initialized, but will process external date range on first render');
      return { startTime, endTime }; // Allow initial sync
    }

    // Compare with current state to see if we actually need to update
    const currentStartTime = DateTime.toEpochMillis(stateRef.current.selectedStartDateTime);
    const currentEndTime = DateTime.toEpochMillis(DateTime.addDuration(stateRef.current.selectedStartDateTime, stateRef.current.selectedDuration));

    console.log('DEBUG: Comparing external vs current dates', {
      external: { startTime, endTime },
      current: { startTime: currentStartTime, endTime: currentEndTime }
    });

    // Only return new values if they're actually different
    if (startTime === currentStartTime && endTime === currentEndTime) {
      console.log('DEBUG: External dates match current state, no update needed');
      return null; // No change needed
    }

    console.log('DEBUG: External dates differ from current state, will update');
    return { startTime, endTime };
  }, [dateRange?.start?.getTime(), dateRange?.end?.getTime(), stateRef.current?.selectedStartDateTime]);

  const sanitizeExternalDateRangeForReset = useMemo(() => {
    if (!dateRangeForReset?.start || !dateRangeForReset?.end) return null;

    // Don't process if state isn't initialized yet
    if (!stateRef.current?.resetStartDateTime) return null;

    const startTime = dateRangeForReset.start.getTime();
    const endTime = dateRangeForReset.end.getTime();

    // Compare with current state to see if we actually need to update
    const currentResetStartTime = DateTime.toEpochMillis(stateRef.current.resetStartDateTime);
    const currentResetEndTime = DateTime.toEpochMillis(DateTime.addDuration(stateRef.current.resetStartDateTime, stateRef.current.resetDuration));

    // Only return new values if they're actually different
    if (startTime === currentResetStartTime && endTime === currentResetEndTime) {
      return null; // No change needed
    }

    return { startTime, endTime };
  }, [dateRangeForReset?.start?.getTime(), dateRangeForReset?.end?.getTime(), stateRef.current?.resetStartDateTime]);

  /**
   * External updates to the date range prop
   */

  useEffect(() => {
    console.log('DEBUG: External prop effect triggered', {
      sanitizeExternalDateRange,
      dateRangeStart: dateRange?.start,
      dateRangeEnd: dateRange?.end
    });
    if (!sanitizeExternalDateRange) return;

    // If animation active and playing, ignore external updates
    if (stateRef.current.animationOrStepMode === AnimationOrStepMode.Animation
      && stateRef.current.animationPlayMode === PlayMode.Play)
      return;

    const newStartDateTime = DateTime.unsafeFromDate(new Date(sanitizeExternalDateRange.startTime));
    const newEndDateTime = DateTime.unsafeFromDate(new Date(sanitizeExternalDateRange.endTime));
    const newDuration = DateTime.distanceDuration(newStartDateTime, newEndDateTime);

    // Additional timing-based protection against rapid updates
    // Allow initial sync by checking if this would be the first meaningful update
    const timeSinceLastUpdate = DateTime.distance(
      DateTime.unsafeNow(), stateRef.current.extSelectedStartDateTimeTimeStamp);
    const isWithinLastSecond = timeSinceLastUpdate < 1000;

    // Check if this is the initial sync (external dates different from current state)
    const currentStartTime = DateTime.toEpochMillis(stateRef.current.selectedStartDateTime);
    const currentEndTime = DateTime.toEpochMillis(DateTime.addDuration(stateRef.current.selectedStartDateTime, stateRef.current.selectedDuration));
    const isInitialSync = sanitizeExternalDateRange.startTime !== currentStartTime || sanitizeExternalDateRange.endTime !== currentEndTime;

    if (isWithinLastSecond && !isInitialSync) {
      console.log('DEBUG: Skipping external update - within last second and not initial sync', { timeSinceLastUpdate, isInitialSync });
      return;
    }

    // Check if the new selection would be outside the current view and update view if needed
    const currentViewStart = stateRef.current.viewStartDateTime;
    const currentViewEnd = DateTime.addDuration(currentViewStart, stateRef.current.viewDuration);

    const selectionOutsideView = DateTime.lessThan(newStartDateTime, currentViewStart) ||
      DateTime.greaterThan(newEndDateTime, currentViewEnd);

    if (selectionOutsideView) {
      console.log('DEBUG: Selection outside view, updating view range');
      // Calculate new view range that encompasses the selection
      const optimalViewStart = calculateOptimalViewStart(
        stateRef.current.selectedStartDateTime,
        newStartDateTime,
        newDuration,
        currentViewStart,
        stateRef.current.viewDuration
      );
      // Only update if the new view start is significantly different (more than 1 minute)
      const timeDiff = Math.abs(DateTime.toEpochMillis(optimalViewStart) - DateTime.toEpochMillis(currentViewStart));
      if (timeDiff > 60000) { // 1 minute threshold
        d(SetViewStartDateTime({ viewStartDateTime: optimalViewStart }));
      }
    }

    d(SetSelectedStartDateTime({
      selectedStartDateTime: newStartDateTime,
      updateSource: UpdateSource.ExternalProp
    }));
    d(SetSelectedDuration({
      selectedDuration: newDuration,
      updateSource: UpdateSource.ExternalProp
    }));
  }, [sanitizeExternalDateRange]);


  /**
   * External updates to date range for reset prop
   */

  useEffect(() => {
    if (!sanitizeExternalDateRangeForReset) return;

    const newResetStartDateTime = DateTime.unsafeFromDate(new Date(sanitizeExternalDateRangeForReset.startTime));
    const newResetEndDateTime = DateTime.unsafeFromDate(new Date(sanitizeExternalDateRangeForReset.endTime));
    const newResetDuration = DateTime.distanceDuration(newResetStartDateTime, newResetEndDateTime);

    d(SetResetStartDateTime({ resetStartDateTime: newResetStartDateTime }));
    d(SetResetDuration({ resetDuration: newResetDuration }));
  }, [sanitizeExternalDateRangeForReset]);



  /**
   * Update selected date if animation active and playing
   */

  // Add ref to track current animation timeout
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    if (s.animationOrStepMode !== AnimationOrStepMode.Animation
      || s.animationPlayMode !== PlayMode.Play)
      return;

    // Animation operates within the overall animation duration
    // The selected range moves by its own duration for each step
    const animationStart = s.animationStartDateTime;
    const animationEnd = DateTime.addDuration(animationStart, s.animationDuration);
    const maxSelectedStart = DateTime.subtractDuration(animationEnd, s.selectedDuration);

    // Calculate the time increment per animation frame
    // animationSpeed is in milliseconds per second, animationRequestFrequency is frame rate in ms
    const timeIncrementPerFrame = Duration.millis(Math.abs(s.animationSpeed) * (s.animationRequestFrequency / 1000));

    const selectedStartDateTime: DateTime.DateTime = match(s.animationSpeed)
      // Forward animation
      .when((x) => x > 0, () =>
        DateTime.addDuration(s.selectedStartDateTime, timeIncrementPerFrame).pipe((x) => DateTime.greaterThan(DateTime.addDuration(x, s.selectedDuration), DateTime.addDuration(animationStart, s.animationDuration)) ?
          animationStart : x))
      // Backward animation
      .otherwise(() =>
        DateTime.subtractDuration(s.selectedStartDateTime, timeIncrementPerFrame).pipe((x) => DateTime.lessThan(x, animationStart) ?
          maxSelectedStart : x));

    const action = () => {
      // Check if animation is still playing when the delayed action executes
      const currentState = stateRef.current;
      if (currentState.animationOrStepMode === AnimationOrStepMode.Animation && currentState.animationPlayMode === PlayMode.Play) {
        d(SetSelectedStartDateTime({ selectedStartDateTime, updateSource: UpdateSource.UserInteraction }));
      }
      animationTimeoutRef.current = null; // Clear ref when animation completes
    };

    // Use setTimeout instead of Effect.js for better control
    animationTimeoutRef.current = setTimeout(action, s.animationRequestFrequency);

    // Cleanup function to cancel pending animation when dependencies change
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, [
    s.animationOrStepMode,
    s.animationPlayMode,
    s.animationSpeed,
    s.animationRequestFrequency,
    s.selectedStartDateTime,
    s.animationStartDateTime,
    s.animationDuration,
    s.selectedDuration
  ]);


  const themeClass = useMemo(() => theme === AppTheme.Dark ? 'dark-theme' : 'light-theme', [theme]);

  // Debug: Check what state looks like
  console.log('DEBUG: State check', {
    selectedStartDateTime: s.selectedStartDateTime,
    selectedDuration: s.selectedDuration,
    viewStartDateTime: s.viewStartDateTime,
    viewDuration: s.viewDuration,
    selectedDurationMillis: s.selectedDuration ? Duration.toMillis(s.selectedDuration) : 'undefined'
  });

  // Early return if state is not properly initialized
  if (!s.selectedStartDateTime || !s.selectedDuration || !s.viewStartDateTime || !s.viewDuration) {
    console.warn('TimeRangeSlider: State not fully initialized, returning null', {
      selectedStartDateTime: !!s.selectedStartDateTime,
      selectedDuration: !!s.selectedDuration,
      viewStartDateTime: !!s.viewStartDateTime,
      viewDuration: !!s.viewDuration
    });
    return null;
  }

  return (
    <div className={`time-range-slider-theme-wrapper ${themeClass}`}>
      <div className={`${className} time-range-slider`}>
        <PrevDateButton onClick={() => {
          const newStart = DateTime.subtractDuration(
            s.viewStartDateTime, Duration.hours(1));
          d(SetViewStartDateTime({ viewStartDateTime: newStart }));
        }} />
        <div ref={sliderRef} className={"horizontal-calendar-grid-body"} >
          <HorizontalCalendar
            increment={DEFAULT_VIEW_INCREMENT}
            isStepMode={s.animationOrStepMode === AnimationOrStepMode.Step}
            primaryRange={s.animationOrStepMode === AnimationOrStepMode.Animation
              ? {
                start: s.animationStartDateTime,
                end: DateTime.addDuration(s.animationStartDateTime, s.animationDuration),
                set: (r: RangeValue<DateTime.DateTime>) => {
                  const convertedStart = r.start;
                  const convertedEnd = r.end;
                  d(SetAnimationStartDateTime({ animationStartDateTime: convertedStart }));
                  d(SetAnimationDuration({
                    animationDuration: DateTime.distanceDuration(convertedStart, convertedEnd)
                  }));
                },
                duration: s.animationDuration
              }
              : (() => {
                const startForDisplay = s.selectedStartDateTime;
                const endForDisplay = DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration || Duration.hours(2));
                console.log('DEBUG: Primary range being passed to HorizontalCalendar', {
                  start: DateTime.toDate(startForDisplay),
                  end: DateTime.toDate(endForDisplay),
                  originalStart: DateTime.toDate(s.selectedStartDateTime),
                  originalEnd: DateTime.toDate(DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration || Duration.hours(2))),
                  timeZone
                });
                return {
                  start: startForDisplay,
                  end: endForDisplay,
                  set: (r: RangeValue<DateTime.DateTime>) => {
                    const convertedStart = r.start;
                    const convertedEnd = r.end;
                    d(SetSelectedStartDateTime({
                      selectedStartDateTime: convertedStart,
                      updateSource: UpdateSource.UserInteraction
                    }));
                    d(SetSelectedDuration({
                      selectedDuration: DateTime.distanceDuration(convertedStart, convertedEnd),
                      updateSource: UpdateSource.UserInteraction
                    }));
                  },
                  duration: s.selectedDuration || Duration.hours(2)
                };
              })()}
            subRanges={s.animationOrStepMode === AnimationOrStepMode.Animation
              ? [{
                start: s.selectedStartDateTime,
                end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration || Duration.hours(2)),
                active: true,
              }]
              : []}
            viewRange={{
              start: s.viewStartDateTime,
              end: DateTime.addDuration(s.viewStartDateTime, s.viewDuration)
            }}
            onSetSelectedStartDateTime={(date: DateTime.DateTime) => {
              const convertedDate = date;
              d(SetSelectedStartDateTime({
                selectedStartDateTime: convertedDate,
                updateSource: UpdateSource.UserInteraction
              }));
            }}
            onSetAnimationStartDateTime={(date: DateTime.DateTime) => {
              const convertedDate = date
              d(SetAnimationStartDateTime({ animationStartDateTime: convertedDate }));
            }}
            onPauseAnimation={() => {
              d(SetAnimationPlayMode({ playMode: PlayMode.Pause }));
            }}
            animationSpeed={s.animationSpeed}
            theme={theme}
            dateRangeForReset={dateRangeForReset}
            timeZone={timeZone}
          />
        </div>
        <NextDateButton onClick={() => {
          const newStart = DateTime.addDuration(
            s.viewStartDateTime, Duration.hours(1));
          d(SetViewStartDateTime({ viewStartDateTime: newStart }));
        }} />
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
          timeZone={timeZone}
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
  );
}
