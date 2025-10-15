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
  
  console.log('calculateViewRange debug:', {
    selectedStart: dateTimeToDate(selectedStart),
    selectedDuration: Duration.toMillis(selectedDuration),
    selectionMidpoint: dateTimeToDate(selectionMidpoint),
    calculatedViewStart: dateTimeToDate(viewStart),
    resetStart: resetStart ? dateTimeToDate(resetStart) : null
  });
  
  // Only apply constraints if they make sense (selected date should be within reset range)
  if (resetStart && resetDuration) {
    const resetEnd = DateTime.addDuration(resetStart, resetDuration);
    const idealViewEnd = DateTime.addDuration(viewStart, viewDuration);
    
    console.log('Checking reset constraints:', {
      resetStart: dateTimeToDate(resetStart),
      resetEnd: dateTimeToDate(resetEnd),
      selectedStart: dateTimeToDate(selectedStart),
      idealViewStart: dateTimeToDate(viewStart),
      idealViewEnd: dateTimeToDate(idealViewEnd),
      selectedIsWithinResetRange: DateTime.greaterThanOrEqualTo(selectedStart, resetStart) && DateTime.lessThanOrEqualTo(selectedStart, resetEnd)
    });
    
    // Only apply constraints if the selected date is actually within the reset range
    // If not, ignore the constraints (they're probably wrong)
    const selectedIsWithinResetRange = DateTime.greaterThanOrEqualTo(selectedStart, resetStart) && DateTime.lessThanOrEqualTo(selectedStart, resetEnd);
    
    if (selectedIsWithinResetRange) {
      if (DateTime.greaterThan(idealViewEnd, resetEnd)) {
        viewStart = DateTime.subtractDuration(resetEnd, viewDuration);
        console.log('Adjusted viewStart to fit reset boundary:', dateTimeToDate(viewStart));
      } else if (DateTime.lessThan(viewStart, resetStart)) {
        viewStart = resetStart;
        console.log('Adjusted viewStart to reset start:', dateTimeToDate(viewStart));
      }
    } else {
      console.log('Selected date is outside reset range, ignoring constraints');
    }
  }
  
  const finalViewStart = roundToFiveMinutes(viewStart);
  console.log('Final viewStart after rounding:', dateTimeToDate(finalViewStart));
  
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
  
  console.log('createInitialState:', {
    selectedStart: dateTimeToDate(selectedStart),
    viewStart: dateTimeToDate(viewStart),
    hasDateRange: !!dateRange?.start
  });
  
  return {
    selectedStart,
    selectedDuration,
    viewStart,
    viewDuration,
    resetStart: resetStart || selectedStart,
    resetDuration: resetDuration || selectedDuration,
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
      console.log('Syncing external props to state', {
        propStart: dateTimeToDate(propStart),
        propDuration: Duration.toMillis(propDuration)
      });
      
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
  const updateSelectedRange = useCallback((start: DateTime.DateTime, duration: Duration.Duration) => {
    setState(prev => {
      // Calculate new view range if selection is outside current view
      const currentViewEnd = DateTime.addDuration(prev.viewStart, prev.viewDuration);
      const newEnd = DateTime.addDuration(start, duration);
      
      let newViewStart = prev.viewStart;
      let newViewDuration = prev.viewDuration;
      
      // Check if selection is outside view
      if (DateTime.lessThan(start, prev.viewStart) || DateTime.greaterThan(newEnd, currentViewEnd)) {
        const viewCalc = calculateViewRange(start, duration, prev.resetStart, prev.resetDuration);
        newViewStart = viewCalc.viewStart;
        newViewDuration = viewCalc.viewDuration;
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
        
        const timeIncrement = Duration.millis(Math.abs(prev.animationSpeed) * (animationRequestFrequency / 1000));
        const animationEnd = DateTime.addDuration(prev.animationStart, prev.animationDuration);
        const maxSelectedStart = DateTime.subtractDuration(animationEnd, prev.selectedDuration);
        
        let newSelectedStart: DateTime.DateTime;
        
        if (prev.animationSpeed > 0) {
          // Forward
          newSelectedStart = DateTime.addDuration(prev.selectedStart, timeIncrement);
          if (DateTime.greaterThan(DateTime.addDuration(newSelectedStart, prev.selectedDuration), animationEnd)) {
            newSelectedStart = prev.animationStart; // Loop back
          }
        } else {
          // Backward
          newSelectedStart = DateTime.subtractDuration(prev.selectedStart, timeIncrement);
          if (DateTime.lessThan(newSelectedStart, prev.animationStart)) {
            newSelectedStart = maxSelectedStart; // Loop back
          }
        }
        
        // Update selection (this will also notify parent)
        setTimeout(() => updateSelectedRange(newSelectedStart, prev.selectedDuration), 0);
        
        return { ...prev, selectedStart: newSelectedStart };
      });
    }, animationRequestFrequency);
  }, [animationRequestFrequency, updateSelectedRange]);
  
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
    setState(prev => ({ ...prev, animationMode: enabled ? AnimationOrStepMode.Animation : AnimationOrStepMode.Step }));
    if (!enabled) {
      stopAnimation();
    }
  }, [stopAnimation]);
  
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
  const primaryRange = useMemo(() => {
    if (state.animationMode === AnimationOrStepMode.Animation) {
      return {
        start: convertDateTimeForDisplay(state.animationStart, timeZoneString),
        end: convertDateTimeForDisplay(DateTime.addDuration(state.animationStart, state.animationDuration), timeZoneString),
        set: (r: RangeValue<DateTime.DateTime>) => {
          const convertedStart = convertDateTimeFromDisplay(r.start, timeZoneString);
          const convertedEnd = convertDateTimeFromDisplay(r.end, timeZoneString);
          setState(prev => ({
            ...prev,
            animationStart: convertedStart,
            animationDuration: DateTime.distanceDuration(convertedStart, convertedEnd)
          }));
        },
        duration: state.animationDuration
      };
    } else {
      return {
        start: convertDateTimeForDisplay(state.selectedStart, timeZoneString),
        end: convertDateTimeForDisplay(DateTime.addDuration(state.selectedStart, state.selectedDuration), timeZoneString),
        set: (r: RangeValue<DateTime.DateTime>) => {
          const convertedStart = convertDateTimeFromDisplay(r.start, timeZoneString);
          const convertedEnd = convertDateTimeFromDisplay(r.end, timeZoneString);
          const duration = DateTime.distanceDuration(convertedStart, convertedEnd);
          updateSelectedRange(convertedStart, duration);
        },
        duration: state.selectedDuration
      };
    }
  }, [state, updateSelectedRange, timeZoneString]);
  
  const subRanges = useMemo(() => {
    if (state.animationMode === AnimationOrStepMode.Animation) {
      return [{
        start: convertDateTimeForDisplay(state.selectedStart, timeZoneString),
        end: convertDateTimeForDisplay(DateTime.addDuration(state.selectedStart, state.selectedDuration), timeZoneString),
        active: true,
      }];
    }
    return [];
  }, [state, timeZoneString]);
  
  const viewRange = useMemo(() => ({
    start: convertDateTimeForDisplay(state.viewStart, timeZoneString),
    end: convertDateTimeForDisplay(DateTime.addDuration(state.viewStart, state.viewDuration), timeZoneString)
  }), [state.viewStart, state.viewDuration, timeZoneString]);
  
  console.log('TimeRangeSlider render state:', {
    selectedStart: dateTimeToDate(state.selectedStart),
    selectedDuration: Duration.toMillis(state.selectedDuration),
    viewStart: dateTimeToDate(state.viewStart),
    animationPlaying: state.animationPlaying
  });
  
  return (
    <div className={`time-range-slider-theme-wrapper ${themeClass}`}>
      <div className={`${className} time-range-slider`}>
        <PrevDateButton onClick={handlePrevDate} />
        
        <div className="horizontal-calendar-grid-body">
          <HorizontalCalendar
            increment={VIEW_INCREMENT}
            isStepMode={state.animationMode === AnimationOrStepMode.Step}
            primaryRange={primaryRange}
            subRanges={subRanges}
            viewRange={viewRange}
            onSetSelectedStartDateTime={(date: DateTime.DateTime) => {
              const convertedDate = convertDateTimeFromDisplay(date, timeZoneString);
              updateSelectedRange(convertedDate, state.selectedDuration);
            }}
            onSetAnimationStartDateTime={(date: DateTime.DateTime) => {
              const convertedDate = convertDateTimeFromDisplay(date, timeZoneString);
              setState(prev => ({ ...prev, animationStart: convertedDate }));
            }}
            onPauseAnimation={stopAnimation}
            animationSpeed={state.animationSpeed}
            theme={theme}
            dateRangeForReset={dateRangeForReset}
            timeZone={timeZoneString}
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