import './timeRangeSlider.css';
import { useEffect, useReducer, useRef } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Data as D, Duration, Effect as E } from 'effect';
import { PrevDateButton, NextDateButton } from "./NewArrowButtons";
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

enum UpdateSource {
  ExternalProp,
  UserInteraction
}

type State = {
  // The current viewable range of dates
  viewStartDateTime: DateTime.DateTime;
  viewDuration: Duration.Duration;

  // Default date and duration to reset to
  resetStartDateTime: DateTime.DateTime;
  resetDuration: Duration.Duration;

  // User-selected date range
  prevSelectedStartDateTime: DateTime.DateTime;
  selectedStartDateTime: DateTime.DateTime;
  extSelectedStartDateTimeTimeStamp: DateTime.DateTime;
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
  SetViewStartDateTime: { viewStartDateTime: DateTime.DateTime; };
  SetViewDuration: { viewDuration: Duration.Duration; };

  SetResetStartDateTime:
  { resetStartDateTime: DateTime.DateTime; };
  SetResetDuration: { resetDuration: Duration.Duration; };

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

const roundDateTimeUpToNearestFiveMinutes = (dateTime: DateTime.DateTime): DateTime.DateTime => dateTime.pipe(
  DateTime.toParts,
  (parts) => {
    const roundedToFiveCeilMins = Math.ceil(parts.minutes / 5) * 5;
    return DateTime.unsafeMake({
      ...parts,
      minutes: roundedToFiveCeilMins,
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
): DateTime.DateTime =>
  match({ pStart, nStart, nDuration, cViewStart, cViewDuration })
    // Selected range longer than current view, start time in middle of view
    .when(({ nDuration, cViewDuration }) => Duration.toMillis(nDuration) > Duration.toMillis(cViewDuration), () => {
      // Adjust view start so selected start is in middle of view
      const midPoint = nStart;
      const unroundedViewStart = DateTime.subtractDuration(midPoint, Duration.millis(Math.floor(Duration.toMillis(cViewDuration) / 2)));
      const optimalViewStart = roundDateTimeDownToNearestFiveMinutes(unroundedViewStart);
      return optimalViewStart;
    })
    // Previous selected range was within view, but new one is not
    // Update so start time is in middle of new view range
    .when(({ pStart, nStart, nDuration, cViewStart, cViewDuration }) => {
      const pEnd = DateTime.addDuration(pStart, nDuration);
      const nEnd = DateTime.addDuration(nStart, nDuration);
      const cViewEnd = DateTime.addDuration(cViewStart, cViewDuration);
      const wasWithinView = DateTime.greaterThanOrEqualTo(pStart, cViewStart)
        && DateTime.lessThanOrEqualTo(pEnd, cViewEnd);
      const isNowOutsideView = DateTime.lessThan(nStart, cViewStart)
        || DateTime.greaterThan(nEnd, cViewEnd);
      return wasWithinView && isNowOutsideView;
    }, () => {
      // Adjust view start so selected start is in middle of view
      const midPoint = nStart;
      const unroundedViewStart = DateTime.subtractDuration(midPoint, Duration.millis(Math.floor(Duration.toMillis(cViewDuration) / 2)));

      const optimalViewStart = roundDateTimeDownToNearestFiveMinutes(unroundedViewStart);
      return optimalViewStart;
    })
    // Previous selected range was within view, and so is new one
    // No change to view start
    .otherwise(() => cViewStart);

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

      // Calculate optimal view range with 5-minute alignment and padding
      const optimalViewStart = calculateOptimalViewStart(
        state.selectedStartDateTime, // Old start
        start,
        state.selectedDuration,
        state.viewStartDateTime,
        state.viewDuration
      );

      // Only update view range if selected date + duration goes outside current view range
      const viewStartDateTime = match([start, state.selectedDuration])
        .when(([s/*, d */]) =>
          DateTime.lessThanOrEqualTo(
            state.viewStartDateTime,
            DateTime.subtractDuration(s, Duration.minutes(5))
          ), () => optimalViewStart)
        .when(([s, d]) =>
          DateTime.greaterThanOrEqualTo(
            DateTime.addDuration(state.viewStartDateTime, state.viewDuration),
            DateTime.addDuration(DateTime.addDuration(s, d), Duration.minutes(5))
          ), () => optimalViewStart)
        .otherwise(() => (state.viewStartDateTime));

      return {
        ...state,
        viewStartDateTime,
        prevSelectedStartDateTime: state.selectedStartDateTime,
        selectedStartDateTime: start,
        extSelectedStartDateTimeTimeStamp: DateTime.unsafeNow(),
      }
    },
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
      extSelectedStartDateTimeTimeStamp: DateTime.unsafeNow(),
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
  onDateRangeSelect: (rv: RangeValue<Date>) => void,
): (state: State, action: Action) => State {
  return (state, action) => {
    const newState = reducer(state, action);

    // Side-effect: Call callback for user interactions that change selected date range
    match(action)
      .with({
        _tag: P.union("SetSelectedStartDateTime", "SetSelectedDuration"),
        updateSource: UpdateSource.UserInteraction
      }, () => {
        const start = newState.selectedStartDateTime;
        const end = DateTime.addDuration(start, newState.selectedDuration);
        onDateRangeSelect({
          start: DateTime.toDate(start),
          end: DateTime.toDate(end)
        });
      })
      .otherwise(() => { /* No action needed */ });

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
  const initSelectedStartDateTime = dateRange
    ? DateTime.unsafeFromDate(dateRange.start)
    : DateTime.unsafeFromDate(new Date());
  const initSelectedDuration = dateRange
    ? DateTime.distanceDuration(
      initSelectedStartDateTime,
      DateTime.unsafeFromDate(dateRange.end))
    : Duration.hours(2);

  const initViewStartDateTime = calculateOptimalViewStart(
    initSelectedStartDateTime,
    initSelectedStartDateTime,
    initSelectedDuration,
    DateTime.subtractDuration(initSelectedStartDateTime, Duration.hours(2)),
    Duration.hours(4));
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


  const [s, d] = useReducer(withMiddleware(reducer, onDateRangeSelect), {
    viewStartDateTime: initViewStartDateTime,
    viewDuration: initViewDuration,

    resetStartDateTime: initResetStartDateTime,
    resetDuration: initResetDuration,

    selectedStartDateTime: initSelectedStartDateTime,
    prevSelectedStartDateTime: initSelectedStartDateTime,
    extSelectedStartDateTimeTimeStamp: DateTime.unsafeNow(),
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
    if (!dateRange) return;

    // If animation active and playing, ignore external updates
    if (s.animationOrStepMode === AnimationOrStepMode.Animation
      && s.animationPlayMode === PlayMode.Play)
      return;

    const newStartDateTime = DateTime.unsafeFromDate(dateRange.start);
    const isWithinLastSecond = DateTime.distance(
      DateTime.unsafeNow(), s.extSelectedStartDateTimeTimeStamp) < 1000;
    const isEqualToCurrentTime = DateTime.distance(newStartDateTime,
      s.selectedStartDateTime) === 0;
    const isEqualToPreviousTime = DateTime.distance(newStartDateTime,
      s.prevSelectedStartDateTime) === 0;

    if (isWithinLastSecond && (isEqualToCurrentTime || isEqualToPreviousTime)) {
      return;
    }

    const newDuration = DateTime.distanceDuration(newStartDateTime, DateTime.unsafeFromDate(dateRange.end));

    // Check if the values are actually different to prevent unnecessary updates
    const currentStart = s.selectedStartDateTime;
    const currentDuration = s.selectedDuration;
    const startChanged = Duration.toMillis(DateTime.distance(currentStart, newStartDateTime)) !== 0;
    const durationChanged = Duration.toMillis(currentDuration) !== Duration.toMillis(newDuration);

    if (startChanged || durationChanged) {
      d(SetSelectedStartDateTime({
        selectedStartDateTime: newStartDateTime,
        updateSource: UpdateSource.ExternalProp
      }));
      d(SetSelectedDuration({
        selectedDuration: newDuration,
        updateSource: UpdateSource.ExternalProp
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Animation operates within the overall animation duration
    // The selected range moves by its own duration for each step
    const animationStart = s.animationStartDateTime;
    const animationEnd = DateTime.addDuration(animationStart, s.animationDuration);
    const maxSelectedStart = DateTime.subtractDuration(animationEnd, s.selectedDuration);


    const selectedStartDateTime: DateTime.DateTime = match(s.animationSpeed)
      // Forward animation
      .when((x) => x > 0, () =>
        DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration).pipe((x) => DateTime.greaterThan(x, maxSelectedStart) ?
          animationStart : x))
      // Backward animation
      .otherwise(() =>
        DateTime.subtractDuration(s.selectedStartDateTime, s.selectedDuration).pipe((x) => DateTime.lessThan(x, animationStart) ?
          maxSelectedStart : x));

    const action = () =>
      d(SetSelectedStartDateTime({ selectedStartDateTime, updateSource: UpdateSource.UserInteraction }));
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
    <div className={`${className} time-range-slider`}>
      <PrevDateButton onClick={() => {
        const newStart = DateTime.subtractDuration(
          s.viewStartDateTime, s.viewDuration);
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
                d(SetSelectedStartDateTime({
                  selectedStartDateTime: r.start,
                  updateSource: UpdateSource.UserInteraction
                }));
                d(SetSelectedDuration({
                  selectedDuration: DateTime.distanceDuration(r.start, r.end),
                  updateSource: UpdateSource.UserInteraction
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
      <NextDateButton onClick={() => {
        const newStart = DateTime.addDuration(
          s.viewStartDateTime, s.viewDuration);
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
      />
      <Divider variant="middle" orientation={"vertical"} flexItem />
      <AnimateAndStepControls
        /* Step controls */
        incrementStartDateTime={() => {
          d(SetSelectedStartDateTime({
            selectedStartDateTime: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
            updateSource: UpdateSource.UserInteraction
          }));
        }}
        decrementStartDateTime={() => {
          d(SetSelectedStartDateTime({
            selectedStartDateTime: DateTime.subtractDuration(s.selectedStartDateTime, s.selectedDuration),
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
        animationDuration={s.animationDuration}
        setAnimationDuration={(duration: Duration.Duration) => {
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

        /* Step range/duration settings */
        rangeValue={TimeDuration[Duration.toMillis(s.selectedDuration)]
          ? Duration.toMillis(s.selectedDuration) as TimeDuration : undefined}
        setRange={
          (timeDuration: TimeDuration) =>
            d(SetSelectedDuration({
              selectedDuration: Duration.millis(timeDuration),
              updateSource: UpdateSource.UserInteraction
            }))
        }
      />
    </div>
  );
}
