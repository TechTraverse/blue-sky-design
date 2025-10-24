import './timeRangeSlider.css';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Duration } from 'effect';
import { PrevDateButton, NextDateButton } from "./NewArrowButtons";
import { HorizontalCalendar } from './HorizontalCalendar';
import { AnimateAndStepControls } from './AnimateAndStepControls';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, Theme as AppTheme, TimeZone } from './timeSliderTypes';
import { DateAndRangeSelect } from './DateAndRangeSelect';
import { Divider } from '@mui/material';

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

/**
 * Central state - single source of truth
 */
interface TimeRangeState {
  // Core date range
  selectedStart: DateTime.DateTime;
  selectedDuration: Duration.Duration;

  // View window
  viewStart: DateTime.DateTime;
  viewDuration: Duration.Duration;

  // Reset boundaries
  resetStart: DateTime.DateTime;
  resetDuration: Duration.Duration;

  // Animation state
  animationMode: AnimationOrStepMode;
  animationPlaying: boolean;
  animationStart: DateTime.DateTime;
  animationDuration: Duration.Duration;
  animationSpeed: AnimationSpeed;
}

/**
 * Default durations and constants
 */
const DEFAULT_SELECTED_DURATION = Duration.minutes(5);
const DEFAULT_VIEW_DURATION = Duration.hours(4);
const DEFAULT_ANIMATION_DURATION = Duration.hours(2);
const VIEW_INCREMENT = Duration.minutes(5).pipe(Duration.toMillis);

/**
 * Utility functions
 */
const roundToFiveMinutes = (dt: DateTime.DateTime): DateTime.DateTime => {
  const parts = DateTime.toParts(dt);
  const roundedMinutes = Math.floor(parts.minutes / 5) * 5;
  return DateTime.unsafeMake({
    ...parts,
    minutes: roundedMinutes,
    seconds: 0,
    milliseconds: 0,
  });
};

const dateToDateTime = (date: Date): DateTime.DateTime => DateTime.unsafeFromDate(date);
const dateTimeToDate = (dt: DateTime.DateTime): Date => DateTime.toDate(dt);

// Timezone conversion for display - converts internal DateTime to display timezone
const convertDateTimeForDisplay = (dt: DateTime.DateTime, tz: 'local' | 'utc'): DateTime.DateTime => {
  if (!dt) {
    console.warn('convertDateTimeForDisplay received undefined DateTime, using current time');
    return DateTime.unsafeNow();
  }

  const timestamp = DateTime.toEpochMillis(dt);
  const jsDate = new Date(timestamp);

  if (tz === 'utc') {
    // Show UTC time for the same moment
    const utcParts = {
      year: jsDate.getUTCFullYear(),
      month: jsDate.getUTCMonth() + 1,
      day: jsDate.getUTCDate(),
      hours: jsDate.getUTCHours(),
      minutes: jsDate.getUTCMinutes(),
      seconds: jsDate.getUTCSeconds(),
      millis: jsDate.getUTCMilliseconds()
    };
    return DateTime.unsafeMake(utcParts);
  } else {
    // Show local time for the same moment
    const localParts = {
      year: jsDate.getFullYear(),
      month: jsDate.getMonth() + 1,
      day: jsDate.getDate(),
      hours: jsDate.getHours(),
      minutes: jsDate.getMinutes(),
      seconds: jsDate.getSeconds(),
      millis: jsDate.getMilliseconds()
    };
    return DateTime.unsafeMake(localParts);
  }
};

// Convert user input back from display timezone to internal representation
const convertDateTimeFromDisplay = (dt: DateTime.DateTime, tz: 'local' | 'utc'): DateTime.DateTime => {
  if (tz === 'utc') {
    // User entered UTC time - create a Date in UTC and convert to DateTime
    const parts = DateTime.toParts(dt);
    const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, parts.seconds, parts.millis));
    return DateTime.unsafeFromDate(utcDate);
  } else {
    // User entered local time - create a Date in local timezone and convert to DateTime
    const parts = DateTime.toParts(dt);
    const localDate = new Date(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, parts.seconds, parts.millis);
    return DateTime.unsafeFromDate(localDate);
  }
};

const calculateViewRange = (
  selectedStart: DateTime.DateTime,
  selectedDuration: Duration.Duration,
  resetStart?: DateTime.DateTime,
  resetDuration?: Duration.Duration
): { viewStart: DateTime.DateTime; viewDuration: Duration.Duration } => {
  const viewDuration = DEFAULT_VIEW_DURATION;

  // Center the selection in the view
  const selectionMidpoint = DateTime.addDuration(selectedStart, Duration.millis(Duration.toMillis(selectedDuration) / 2));
  let viewStart = DateTime.subtractDuration(selectionMidpoint, Duration.millis(Duration.toMillis(viewDuration) / 2));

  // Only apply constraints if they make sense (selected date should be within reset range)
  if (resetStart && resetDuration) {
    const resetEnd = DateTime.addDuration(resetStart, resetDuration);
    const idealViewEnd = DateTime.addDuration(viewStart, viewDuration);

    // Only apply constraints if the selected date is actually within the reset range
    // If not, ignore the constraints (they're probably wrong)
    const selectedIsWithinResetRange = DateTime.greaterThanOrEqualTo(selectedStart, resetStart) && DateTime.lessThanOrEqualTo(selectedStart, resetEnd);

    if (selectedIsWithinResetRange) {
      if (DateTime.greaterThan(idealViewEnd, resetEnd)) {
        viewStart = DateTime.subtractDuration(resetEnd, viewDuration);
      } else if (DateTime.lessThan(viewStart, resetStart)) {
        viewStart = resetStart;
      }
    }
  }

  const finalViewStart = roundToFiveMinutes(viewStart);

  return {
    viewStart: finalViewStart,
    viewDuration
  };
};

/**
 * Initialize state from props
 */
const createInitialState = (
  dateRange?: RangeValue<Date>,
  dateRangeForReset?: RangeValue<Date>
): TimeRangeState => {
  // Selected range
  const selectedStart = dateRange?.start ? dateToDateTime(dateRange.start) : DateTime.unsafeNow();
  const selectedDuration = dateRange?.start && dateRange?.end
    ? DateTime.distanceDuration(dateToDateTime(dateRange.start), dateToDateTime(dateRange.end))
    : DEFAULT_SELECTED_DURATION;

  // Reset boundaries - if no reset range provided, don't constrain the view
  const resetStart = dateRangeForReset?.start ? dateToDateTime(dateRangeForReset.start) : undefined;
  const resetDuration = dateRangeForReset?.start && dateRangeForReset?.end
    ? DateTime.distanceDuration(dateToDateTime(dateRangeForReset.start), dateToDateTime(dateRangeForReset.end))
    : undefined;

  // Calculate view range
  const { viewStart, viewDuration } = calculateViewRange(selectedStart, selectedDuration, resetStart, resetDuration);

  return {
    selectedStart,
    selectedDuration,
    viewStart,
    viewDuration,
    // Use sensible fallbacks for reset boundaries - don't constrain animation to selected range
    resetStart: resetStart || DateTime.subtractDuration(selectedStart, Duration.hours(12)),
    resetDuration: resetDuration || Duration.hours(24),
    animationMode: AnimationOrStepMode.Step,
    animationPlaying: false,
    animationStart: selectedStart,
    animationDuration: DEFAULT_ANIMATION_DURATION,
    animationSpeed: AnimationSpeed['5 min/sec'],
  };
};

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

  // Initialize state
  const [state, setState] = useState<TimeRangeState>(() =>
    createInitialState(dateRange, dateRangeForReset)
  );

  // Animation interval ref
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Timezone utilities
  const timeZoneString: 'local' | 'utc' = timeZone === TimeZone.Local ? 'local' : 'utc';

  const handleTimeZoneChange = (newTimeZone: 'local' | 'utc') => {
    const newTimeZoneEnum = newTimeZone === 'local' ? TimeZone.Local : TimeZone.UTC;
    onTimeZoneChange?.(newTimeZoneEnum);
  };

  /**
   * External prop synchronization - simple and predictable
   */
  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) return;

    const propStart = dateToDateTime(dateRange.start);
    const propDuration = DateTime.distanceDuration(propStart, dateToDateTime(dateRange.end));

    // Only update if actually different
    const currentStart = DateTime.toEpochMillis(state.selectedStart);
    const currentEnd = DateTime.toEpochMillis(DateTime.addDuration(state.selectedStart, state.selectedDuration));
    const propStartMs = DateTime.toEpochMillis(propStart);
    const propEndMs = DateTime.toEpochMillis(DateTime.addDuration(propStart, propDuration));

    if (propStartMs !== currentStart || propEndMs !== currentEnd) {
      // Update both selected range and view range
      setState(prev => {
        const { viewStart, viewDuration } = calculateViewRange(propStart, propDuration, prev.resetStart, prev.resetDuration);
        return {
          ...prev,
          selectedStart: propStart,
          selectedDuration: propDuration,
          viewStart,
          viewDuration
        };
      });

      // DON'T notify parent during prop sync to avoid feedback loops
    }
  }, [dateRange?.start?.getTime(), dateRange?.end?.getTime()]);

  /**
   * Reset boundaries synchronization
   */
  useEffect(() => {
    if (!dateRangeForReset?.start || !dateRangeForReset?.end) return;

    const resetStart = dateToDateTime(dateRangeForReset.start);
    const resetDuration = DateTime.distanceDuration(resetStart, dateToDateTime(dateRangeForReset.end));

    setState(prev => ({ ...prev, resetStart, resetDuration }));
  }, [dateRangeForReset?.start?.getTime(), dateRangeForReset?.end?.getTime()]);

  /**
   * Core state update functions
   */
  const updateSelectedRange = useCallback((start: DateTime.DateTime, duration: Duration.Duration, skipViewUpdate?: boolean) => {
    setState(prev => {
      let newViewStart = prev.viewStart;
      let newViewDuration = prev.viewDuration;

      // Only update view if not skipping and not in animation mode
      if (!skipViewUpdate && prev.animationMode !== AnimationOrStepMode.Animation) {
        // Calculate new view range if selection is outside current view
        const currentViewEnd = DateTime.addDuration(prev.viewStart, prev.viewDuration);
        const newEnd = DateTime.addDuration(start, duration);

        // Check if selection is outside view
        if (DateTime.lessThan(start, prev.viewStart) || DateTime.greaterThan(newEnd, currentViewEnd)) {
          const viewCalc = calculateViewRange(start, duration, prev.resetStart, prev.resetDuration);
          newViewStart = viewCalc.viewStart;
          newViewDuration = viewCalc.viewDuration;
        }
      }

      return {
        ...prev,
        selectedStart: start,
        selectedDuration: duration,
        viewStart: newViewStart,
        viewDuration: newViewDuration,
      };
    });

    // Notify parent
    onDateRangeSelect({
      start: dateTimeToDate(start),
      end: dateTimeToDate(DateTime.addDuration(start, duration))
    });
  }, [onDateRangeSelect]);

  const updateViewRange = useCallback((start: DateTime.DateTime, duration?: Duration.Duration) => {
    setState(prev => ({
      ...prev,
      viewStart: roundToFiveMinutes(start),
      viewDuration: duration || prev.viewDuration,
    }));
  }, []);

  /**
   * Animation control - clear and predictable
   */
  const startAnimation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    setState(prev => ({ ...prev, animationPlaying: true }));

    animationRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.animationPlaying) return prev;

        // Animation speed is in milliseconds per second
        // animationRequestFrequency is the interval between frames in milliseconds
        // So the increment per frame should be: (speed in ms/sec) * (frame_interval in ms / 1000ms/sec)
        const timeIncrement = Duration.millis(Math.abs(prev.animationSpeed) * (animationRequestFrequency / 1000));
        const animationEnd = DateTime.addDuration(prev.animationStart, prev.animationDuration);
        const maxSelectedStart = DateTime.subtractDuration(animationEnd, prev.selectedDuration);

        console.log('Animation step:', {
          currentSelected: DateTime.toDate(prev.selectedStart),
          animationStart: DateTime.toDate(prev.animationStart),
          animationEnd: DateTime.toDate(animationEnd),
          maxSelectedStart: DateTime.toDate(maxSelectedStart),
          timeIncrement: Duration.toMillis(timeIncrement),
          animationSpeed: prev.animationSpeed
        });

        let newSelectedStart: DateTime.DateTime;

        if (prev.animationSpeed > 0) {
          // Forward animation
          newSelectedStart = DateTime.addDuration(prev.selectedStart, timeIncrement);

          // Check bounds - if we'd go past the animation end, loop back to start
          const newSelectedEnd = DateTime.addDuration(newSelectedStart, prev.selectedDuration);
          if (DateTime.greaterThan(newSelectedEnd, animationEnd)) {
            newSelectedStart = prev.animationStart;
            console.log('Animation looped back to start');
          }
        } else {
          // Backward animation
          newSelectedStart = DateTime.subtractDuration(prev.selectedStart, timeIncrement);

          // Check bounds - if we'd go before the animation start, loop back to end
          if (DateTime.lessThan(newSelectedStart, prev.animationStart)) {
            newSelectedStart = maxSelectedStart;
            console.log('Animation looped back to end');
          }
        }

        console.log('Animation new position:', {
          newSelected: DateTime.toDate(newSelectedStart),
          moved: DateTime.toEpochMillis(newSelectedStart) !== DateTime.toEpochMillis(prev.selectedStart)
        });

        // Update both internal state and notify parent
        const newState = { ...prev, selectedStart: newSelectedStart };

        // Async update to parent to avoid state conflicts
        setTimeout(() => {
          onDateRangeSelect({
            start: dateTimeToDate(newSelectedStart),
            end: dateTimeToDate(DateTime.addDuration(newSelectedStart, prev.selectedDuration))
          });
        }, 0);

        return newState;
      });
    }, animationRequestFrequency);
  }, [animationRequestFrequency, onDateRangeSelect]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setState(prev => ({ ...prev, animationPlaying: false }));
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, []);

  /**
   * Animation mode and control handlers
   */
  const handleAnimationModeChange = useCallback((enabled: boolean) => {
    if (enabled) {
      // When enabling animation, set up proper animation range with boundary guards
      setState(prev => {
        let animationStart = prev.selectedStart;
        let animationDuration = DEFAULT_ANIMATION_DURATION;

        // Only apply strict boundary constraints if explicit reset boundaries were provided
        // and they're actually different from the selected range (meaningful constraints)
        const hasExplicitResetBoundaries = dateRangeForReset?.start && dateRangeForReset?.end;
        const resetRangeIsMeaningful = hasExplicitResetBoundaries && (
          DateTime.toEpochMillis(prev.resetStart) !== DateTime.toEpochMillis(prev.selectedStart) ||
          Duration.toMillis(prev.resetDuration) !== Duration.toMillis(prev.selectedDuration)
        );

        if (resetRangeIsMeaningful && prev.resetStart && prev.resetDuration) {
          const resetEnd = DateTime.addDuration(prev.resetStart, prev.resetDuration);
          const proposedAnimationEnd = DateTime.addDuration(animationStart, animationDuration);

          // Check if animation would exceed boundaries
          if (DateTime.greaterThan(proposedAnimationEnd, resetEnd) || DateTime.lessThan(animationStart, prev.resetStart)) {
            // Try to shift the animation window to fit within boundaries
            if (DateTime.greaterThan(proposedAnimationEnd, resetEnd)) {
              // Animation extends past end - shift it back
              const maxValidStart = DateTime.subtractDuration(resetEnd, animationDuration);
              if (DateTime.greaterThanOrEqualTo(maxValidStart, prev.resetStart)) {
                animationStart = maxValidStart;
                console.log('Animation range shifted back to fit within valid dates:', {
                  originalStart: DateTime.toDate(prev.selectedStart),
                  shiftedStart: DateTime.toDate(animationStart),
                  animationEnd: DateTime.toDate(DateTime.addDuration(animationStart, animationDuration)),
                  resetEnd: DateTime.toDate(resetEnd)
                });
              } else {
                // Can't fit full duration - reduce it
                animationDuration = DateTime.distanceDuration(prev.resetStart, resetEnd);
                animationStart = prev.resetStart;
                console.log('Animation duration reduced to fit within valid dates');
              }
            } else if (DateTime.lessThan(animationStart, prev.resetStart)) {
              // Animation starts before valid range - shift it forward
              animationStart = prev.resetStart;
              const newAnimationEnd = DateTime.addDuration(animationStart, animationDuration);
              if (DateTime.greaterThan(newAnimationEnd, resetEnd)) {
                // Still extends past end after shifting - reduce duration
                animationDuration = DateTime.distanceDuration(prev.resetStart, resetEnd);
                console.log('Animation shifted forward and duration reduced to fit within valid dates');
              } else {
                console.log('Animation range shifted forward to fit within valid dates:', {
                  originalStart: DateTime.toDate(prev.selectedStart),
                  shiftedStart: DateTime.toDate(animationStart),
                  animationEnd: DateTime.toDate(DateTime.addDuration(animationStart, animationDuration))
                });
              }
            }
          }
        } else {
          console.log('No meaningful reset boundaries - allowing full 2-hour animation range');
        }

        // Calculate view that encompasses the animation range if needed
        let newViewStart = prev.viewStart;
        let newViewDuration = prev.viewDuration;

        const animationEnd = DateTime.addDuration(animationStart, animationDuration);
        const currentViewEnd = DateTime.addDuration(prev.viewStart, prev.viewDuration);

        // Only update view if animation range extends outside current view
        if (DateTime.lessThan(animationStart, prev.viewStart) || DateTime.greaterThan(animationEnd, currentViewEnd)) {
          const combinedStart = DateTime.lessThan(prev.selectedStart, animationStart) ? prev.selectedStart : animationStart;
          const selectedEnd = DateTime.addDuration(prev.selectedStart, prev.selectedDuration);
          const combinedEnd = DateTime.greaterThan(selectedEnd, animationEnd) ? selectedEnd : animationEnd;
          const combinedDuration = DateTime.distanceDuration(combinedStart, combinedEnd);

          const viewCalc = calculateViewRange(combinedStart, combinedDuration, prev.resetStart, prev.resetDuration);
          newViewStart = viewCalc.viewStart;
          newViewDuration = viewCalc.viewDuration;

          console.log('One-time view update for animation range:', {
            oldView: { start: DateTime.toDate(prev.viewStart), end: DateTime.toDate(currentViewEnd) },
            newView: { start: DateTime.toDate(newViewStart), end: DateTime.toDate(DateTime.addDuration(newViewStart, newViewDuration)) },
            animationRange: { start: DateTime.toDate(animationStart), end: DateTime.toDate(animationEnd) }
          });
        }

        const newState = {
          ...prev,
          animationMode: AnimationOrStepMode.Animation,
          animationStart,
          animationDuration,
          viewStart: newViewStart,
          viewDuration: newViewDuration
        };

        console.log('Setting animation state:', {
          animationMode: newState.animationMode,
          animationStart: DateTime.toDate(newState.animationStart),
          animationEnd: DateTime.toDate(DateTime.addDuration(newState.animationStart, newState.animationDuration)),
          animationDuration: Duration.toMillis(newState.animationDuration)
        });

        return newState;
      });
    } else {
      setState(prev => ({ ...prev, animationMode: AnimationOrStepMode.Step }));
      stopAnimation();
    }
  }, [stopAnimation, dateRangeForReset]);

  const handlePlayModeChange = useCallback((mode: PlayMode) => {
    if (mode === PlayMode.Play) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [startAnimation, stopAnimation]);

  /**
   * UI event handlers
   */
  const handlePrevDate = useCallback(() => {
    const newStart = DateTime.subtractDuration(state.viewStart, Duration.hours(1));
    updateViewRange(newStart);
  }, [state.viewStart, updateViewRange]);

  const handleNextDate = useCallback(() => {
    const newStart = DateTime.addDuration(state.viewStart, Duration.hours(1));
    updateViewRange(newStart);
  }, [state.viewStart, updateViewRange]);

  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedStart: prev.resetStart,
      selectedDuration: prev.resetDuration,
      animationMode: AnimationOrStepMode.Step,
      animationPlaying: false,
    }));
    stopAnimation();

    // Update view and notify parent
    const { viewStart, viewDuration } = calculateViewRange(state.resetStart, state.resetDuration, state.resetStart, state.resetDuration);
    updateViewRange(viewStart, viewDuration);

    onDateRangeSelect({
      start: dateTimeToDate(state.resetStart),
      end: dateTimeToDate(DateTime.addDuration(state.resetStart, state.resetDuration))
    });
  }, [state.resetStart, state.resetDuration, stopAnimation, updateViewRange, onDateRangeSelect]);

  // Theme class
  const themeClass = useMemo(() => theme === AppTheme.Dark ? 'dark-theme' : 'light-theme', [theme]);

  // Render ranges for HorizontalCalendar
  const primaryRangeForHorizontalCalendar = useMemo(() =>
    state.animationMode === AnimationOrStepMode.Animation
      ? {
        start: state.animationStart,
        end: DateTime.addDuration(
          state.animationStart, state.animationDuration),
        set: (r: RangeValue<DateTime.DateTime>) => {
          setState(prev => ({
            ...prev,
            animationStart: r.start,
            animationDuration: DateTime.distanceDuration(r.start, r.end)
          }));
        },
        duration: state.animationDuration
      }
      : {
        start: state.selectedStart,
        end: DateTime.addDuration(
          state.selectedStart, state.selectedDuration),
        set: (r: RangeValue<DateTime.DateTime>) => {
          const duration = DateTime.distanceDuration(r.start, r.end);
          updateSelectedRange(r.start, duration);
        },
        duration: state.selectedDuration
      }, [state, updateSelectedRange]);

  const subRange = useMemo(() => {
    if (state.animationMode === AnimationOrStepMode.Animation) {
      return {
        start: state.selectedStart,
        end: DateTime.addDuration(state.selectedStart, state.selectedDuration),
        active: true,
      };
    }
    return [];
  }, [state]);

  const viewRange = useMemo(() => ({
    start: convertDateTimeForDisplay(state.viewStart, timeZoneString),
    end: convertDateTimeForDisplay(DateTime.addDuration(state.viewStart, state.viewDuration), timeZoneString)
  }), [state.viewStart, state.viewDuration, timeZoneString]);

  console.log('TimeRangeSlider render state:', {
    selectedStart: dateTimeToDate(state.selectedStart),
    selectedDuration: Duration.toMillis(state.selectedDuration),
    viewStart: dateTimeToDate(state.viewStart),
    animationMode: state.animationMode,
    animationPlaying: state.animationPlaying,
    animationStart: state.animationMode === AnimationOrStepMode.Animation ? dateTimeToDate(state.animationStart) : null,
    animationEnd: state.animationMode === AnimationOrStepMode.Animation ? dateTimeToDate(DateTime.addDuration(state.animationStart, state.animationDuration)) : null
  });

  return (
    <div className={`time-range-slider-theme-wrapper ${themeClass}`}>
      <div className={`${className} time-range-slider`}>
        <PrevDateButton onClick={handlePrevDate} />

        <div className="horizontal-calendar-grid-body">
          <HorizontalCalendar
            // isStepMode={state.animationMode === AnimationOrStepMode.Step}
            primaryRange={primaryRangeForHorizontalCalendar}
            subRange={subRange}
            viewRange={viewRange}
            latestValidDateTime={ }
            timeZone={"timeZoneEnum"}
            increment={VIEW_INCREMENT}
            theme={theme}
          // onSetSelectedStartDateTime={(date: DateTime.DateTime) => {
          //   const convertedDate = convertDateTimeFromDisplay(date, timeZoneString);
          //   updateSelectedRange(convertedDate, state.selectedDuration);
          // }}
          // onSetAnimationStartDateTime={(date: DateTime.DateTime) => {
          //   const convertedDate = convertDateTimeFromDisplay(date, timeZoneString);
          //   setState(prev => ({ ...prev, animationStart: convertedDate }));
          // }}
          // onPauseAnimation={stopAnimation}
          // animationSpeed={state.animationSpeed}
          // dateRangeForReset={dateRangeForReset}
          // timeZone={timeZoneString}
          />
        </div>

        <NextDateButton onClick={handleNextDate} />

        <DateAndRangeSelect
          startDateTime={state.selectedStart}
          setStartDateTime={(date: DateTime.DateTime) => {
            updateSelectedRange(date, state.selectedDuration);
          }}
          returnToDefaultDateTime={handleReset}
          timeZone={timeZoneString}
          onTimeZoneChange={handleTimeZoneChange}
          rangeValue={TimeDuration[Duration.toMillis(state.selectedDuration)] as TimeDuration}
          setRange={(timeDuration: TimeDuration) => {
            updateSelectedRange(state.selectedStart, Duration.millis(timeDuration));
          }}
          dateRangeForReset={dateRangeForReset}
        />

        <Divider variant="middle" orientation="vertical" flexItem />

        <AnimateAndStepControls
          incrementStartDateTime={() => {
            const newStart = DateTime.addDuration(state.selectedStart, state.selectedDuration);
            updateSelectedRange(newStart, state.selectedDuration);
          }}
          decrementStartDateTime={() => {
            const newStart = DateTime.subtractDuration(state.selectedStart, state.selectedDuration);
            updateSelectedRange(newStart, state.selectedDuration);
          }}
          animationEnabled={state.animationMode === AnimationOrStepMode.Animation}
          setAnimationEnabled={handleAnimationModeChange}
          playMode={state.animationPlaying ? PlayMode.Play : PlayMode.Pause}
          setPlayMode={handlePlayModeChange}
          animationSpeed={state.animationSpeed}
          setAnimationSpeed={(speed: AnimationSpeed) => {
            setState(prev => ({ ...prev, animationSpeed: speed }));
          }}
          animationDuration={state.animationDuration}
          setAnimationDuration={(duration: Duration.Duration) => {
            setState(prev => ({ ...prev, animationDuration: duration }));
          }}
          incrementAnimationSpeed={() => {
            // Implementation for speed increment
          }}
          decrementAnimationSpeed={() => {
            // Implementation for speed decrement
          }}
        />
      </div>
    </div>
  );
};
