import './timeRangeSlider.css';
import { useEffect, useReducer, useRef } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Data as D, Duration, Effect as E } from 'effect';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';
import { AnimateAndStepControls } from './AnimateAndStepControls';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration } from './timeSliderTypes';
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
}

type State = {
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

type Action = D.TaggedEnum<{
  SetViewStartDateTime: { viewStartDateTime: DateTime.DateTime; };
  SetViewDuration: { viewDuration: Duration.Duration; };

  SetResetStartDateTime:
  { resetStartDateTime: DateTime.DateTime; };
  SetResetDuration: { resetDuration: Duration.Duration; };

  SetSelectedStartDateTime:
  { selectedStartDateTime: DateTime.DateTime; };
  SetSelectedDuration: { selectedDuration: Duration.Duration; };

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


/**
 * Constants
 */

const DEFAULT_ANIMATION_DURATION = Duration.hours(2);
const DEFAULT_VIEW_INCREMENT = Duration.minutes(5).pipe(Duration.toMillis);

const {
  $match: $actionMatch,
  $is: $actionIs,
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

const widthToDuration: (width: number) => Duration.Duration = (width) => match(width)
  .with(P.number.lt(350), () => Duration.hours(1))
  .with(P.number.lt(700), () => Duration.hours(2))
  .with(P.number.lt(1050), () => Duration.hours(3))
  .with(P.number.lt(1400), () => Duration.hours(4))
  .with(P.number.lt(1750), () => Duration.hours(5))
  .with(P.number.lt(2100), () => Duration.hours(6))
  .otherwise(() => Duration.hours(21));


/**
 * State management: reducer
 */

const reducer = (state: State, action: Action): State =>
  $actionMatch({
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

    SetSelectedStartDateTime: (x) => {
      const start = x.selectedStartDateTime;
      const end = DateTime.addDuration(start, state.selectedDuration);

      // Update view range if selection outside of current view
      const updatedViewStartDateTime =
        DateTime.lessThan(start, state.viewStartDateTime)
          ? {
            viewStartDateTime:
              DateTime
                .subtractDuration(start, Duration.hours(1)).pipe(
                  roundDateTimeDownToNearestFiveMinutes),
          }
          : DateTime.greaterThan(end, DateTime.addDuration(state.viewStartDateTime, state.viewDuration))
            ? {
              viewStartDateTime: start.pipe(
                roundDateTimeDownToNearestFiveMinutes),
            }
            : {};

      return {
        ...state,
        ...updatedViewStartDateTime,
        selectedStartDateTime: start,
      }
    },
    SetSelectedDuration: (x) => ({
      ...state,
      selectedDuration: x.selectedDuration,
    }),

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


/**
 * Middleware for streaming dispatch state updates
 */

function withMiddleware(
  reducer: (state: State, action: Action) => State,
  onDateRangeSelect: (rv: RangeValue<Date>) => void
): (state: State, action: Action) => State {
  return (state, action) => {
    const newState = reducer(state, action);

    // Call callback for actions that change the selected range
    if ($actionIs("SetSelectedStartDateTime")(action) ||
      $actionIs("SetSelectedDuration")(action)) {
      const start = newState.selectedStartDateTime;
      const end = DateTime.addDuration(start, newState.selectedDuration);
      onDateRangeSelect({
        start: DateTime.toDate(start),
        end: DateTime.toDate(end)
      });
    }

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
}: TimeRangeSliderProps) => {

  /**
   * Vals for reducer on component init
   */
  const initViewStartDateTime = DateTime.unsafeFromDate(
    dateRange?.start ?? new Date()).pipe(roundDateTimeDownToNearestFiveMinutes);
  const initViewDuration = dateRange
    ? DateTime.distanceDuration(
      initViewStartDateTime,
      DateTime.unsafeFromDate(dateRange.end)
        .pipe(roundDateTimeDownToNearestFiveMinutes))
    : Duration.hours(4);

  const initResetStartDateTime = dateRangeForReset
    ? DateTime.unsafeFromDate(dateRangeForReset.start)
    : initViewStartDateTime;
  const initResetDuration = dateRangeForReset
    ? DateTime.distanceDuration(
      initResetStartDateTime, DateTime.unsafeFromDate(dateRangeForReset.end))
    : Duration.hours(4);

  const initSelectedStartDateTime = dateRange
    ? DateTime.unsafeFromDate(dateRange.start)
    : DateTime.unsafeFromDate(new Date());
  const initSelectedDuration = dateRange
    ? DateTime.distanceDuration(
      initSelectedStartDateTime,
      DateTime.unsafeFromDate(dateRange.end))
    : Duration.hours(2);

  const [s, d] = useReducer(withMiddleware(reducer, onDateRangeSelect), {
    viewStartDateTime: initViewStartDateTime,
    viewDuration: initViewDuration,

    resetStartDateTime: initResetStartDateTime,
    resetDuration: initResetDuration,

    selectedStartDateTime: initSelectedStartDateTime,
    selectedDuration: initSelectedDuration,

    animationOrStepMode: AnimationOrStepMode.Step,

    resetAnimationSpeed: AnimationSpeed['5 min/sec'],
    resetAnimationDuration: DEFAULT_ANIMATION_DURATION,
    animationStartDateTime: initSelectedStartDateTime,
    animationDuration: DEFAULT_ANIMATION_DURATION,
    animationRequestFrequency,
    animationPlayMode: PlayMode.Pause,
    animationSpeed: AnimationSpeed['5 min/sec'],
  });


  /**
   * Set up observer to update view duration based on the width of the slider
   */

  const sliderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const viewDuration = widthToDuration(width);

        d(SetViewDuration({ viewDuration }));
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
   * External updates to the date range prop
   */

  useEffect(() => {
    if (dateRange) {
      const newStartDateTime = DateTime.unsafeFromDate(dateRange.start);
      const newDuration = DateTime.distanceDuration(newStartDateTime, DateTime.unsafeFromDate(dateRange.end));
      d(SetSelectedStartDateTime({ selectedStartDateTime: newStartDateTime }));
      d(SetSelectedDuration({ selectedDuration: newDuration }));
    }
  }, [dateRange]);


  /**
   * External updates to date range for reset prop
   */

  useEffect(() => {
    if (dateRangeForReset) {
      const newResetStartDateTime = DateTime.unsafeFromDate(dateRangeForReset.start);
      const newResetDuration = DateTime.distanceDuration(newResetStartDateTime, DateTime.unsafeFromDate(dateRangeForReset.end));
      d(SetResetStartDateTime({ resetStartDateTime: newResetStartDateTime }));
      d(SetResetDuration({ resetDuration: newResetDuration }));
    }
  }, [dateRangeForReset]);



  /**
   * Update selected date if animation active and playing
   */

  useEffect(() => {
    if (s.animationOrStepMode !== AnimationOrStepMode.Animation
      || s.animationPlayMode !== PlayMode.Play)
      return;

    console.log('Animation useEffect triggered', { 
      selectedStartDateTime: DateTime.toDate(s.selectedStartDateTime),
      animationStartDateTime: DateTime.toDate(s.animationStartDateTime),
      animationSpeed: s.animationSpeed,
      animationRequestFrequency: s.animationRequestFrequency
    });

    // Animation operates within the overall animation duration
    // The selected range moves by its own duration for each step
    const animationStart = s.animationStartDateTime;
    const animationEnd = DateTime.addDuration(animationStart, s.animationDuration);
    const maxSelectedStart = DateTime.subtractDuration(animationEnd, s.selectedDuration);

    let selectedStartDateTime: DateTime.DateTime;
    if (s.animationSpeed > 0) {
      // Forward animation: move by selected duration
      selectedStartDateTime = DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration);
      // Check if selected range would extend past animation end
      if (DateTime.greaterThan(selectedStartDateTime, maxSelectedStart)) {
        // Loop back to animation start
        selectedStartDateTime = animationStart;
      }
    } else {
      // Backward animation: move back by selected duration
      selectedStartDateTime = DateTime.subtractDuration(s.selectedStartDateTime, s.selectedDuration);
      // Check if we've gone before animation start
      if (DateTime.lessThan(selectedStartDateTime, animationStart)) {
        // Loop to end of animation range (accounting for selected duration)
        selectedStartDateTime = maxSelectedStart;
      }
    }

    console.log('Next selectedStartDateTime will be:', DateTime.toDate(selectedStartDateTime));

    const action = () =>
      d(SetSelectedStartDateTime({ selectedStartDateTime }));
    const program = E.delay(E.sync(action), Duration.millis(s.animationRequestFrequency));
    E.runPromise(program).then();
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


  return (
    <div ref={sliderRef} className={`${className} time-range-slider`}>
      <button className="next-prev-date-range">
        <IoIosArrowBack
          onClick={() => {
            const newStart = DateTime.subtractDuration(
              s.viewStartDateTime, s.viewDuration);
            d(SetViewStartDateTime({ viewStartDateTime: newStart }));
          }}
          title='Previous'
        />
      </button>
      <div className={"horizontal-calendar-grid-body"} >
        <HorizontalCalendar
          increment={DEFAULT_VIEW_INCREMENT}
          primaryRange={s.animationOrStepMode === AnimationOrStepMode.Animation
            ? {
              start: s.animationStartDateTime,
              end: DateTime.addDuration(s.animationStartDateTime, s.animationDuration),
              set: (r: RangeValue<DateTime.DateTime>) => {
                d(SetAnimationStartDateTime({ animationStartDateTime: r.start }));
                d(SetAnimationDuration({
                  animationDuration: DateTime.distanceDuration(r.start, r.end)
                }));
              },
              duration: s.animationDuration
            }
            : {
              start: s.selectedStartDateTime,
              end: DateTime.addDuration(
                s.selectedStartDateTime, s.selectedDuration),
              set: (r: RangeValue<DateTime.DateTime>) => {
                d(SetSelectedStartDateTime({ selectedStartDateTime: r.start }));
                d(SetSelectedDuration({
                  selectedDuration: DateTime.distanceDuration(r.start, r.end)
                }));
              },
              duration: s.selectedDuration
            }}
          subRanges={s.animationOrStepMode === AnimationOrStepMode.Animation
            ? [{
              start: s.selectedStartDateTime,
              end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
              active: true,
            }]
            : []}
          viewRange={{ start: s.viewStartDateTime, end: DateTime.addDuration(s.viewStartDateTime, s.viewDuration) }}
        />
      </div>
      <button className="next-prev-date-range">
        <IoIosArrowForward
          onClick={() => {
            const newStart = DateTime.addDuration(
              s.viewStartDateTime, s.viewDuration);
            d(SetViewStartDateTime({ viewStartDateTime: newStart }));
          }}
          title='Next'
        />
      </button>
      <DateAndRangeSelect
        startDateTime={s.selectedStartDateTime}
        setStartDateTime={(date: DateTime.DateTime) => {
          d(SetSelectedStartDateTime({ selectedStartDateTime: date }));
        }}
        returnToDefaultDateTime={() => {
          d(ResetAll());
        }}
        rangeValue={TimeDuration[Duration.toMillis(s.selectedDuration)]
          ? Duration.toMillis(s.selectedDuration) as TimeDuration : undefined}
        setRange={
          (timeDuration: TimeDuration) =>
            d(SetSelectedDuration({ selectedDuration: Duration.millis(timeDuration) }))
        }
      />
      <Divider variant="middle" orientation={"vertical"} flexItem />
      <AnimateAndStepControls
        /* Step controls */
        incrementStartDateTime={() => {
          d(SetSelectedStartDateTime({
            selectedStartDateTime: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration)
          }));
        }}
        decrementStartDateTime={() => {
          d(SetSelectedStartDateTime({
            selectedStartDateTime: DateTime.subtractDuration(s.selectedStartDateTime, s.selectedDuration)
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
            d(SetAnimationStartDateTime({ animationStartDateTime: s.selectedStartDateTime }));
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
  );
}
