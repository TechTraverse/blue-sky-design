import './timeRangeSlider.css';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Option as O, Data as D, Duration, Effect as E } from 'effect';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';
import { AnimateAndStepControls } from './AnimateAndStepControls';
import { AnimationOrStepMode, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, type PrimaryRange, type SubRange } from './timeSliderTypes';
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
  SetDefaultAnimationSpeed:
  { defaultAnimationSpeed: AnimationSpeed; };

  ResetAll: object;
}>;


/**
 * Constants
 */

const DEFAULT_ANIMATION_DURATION = Duration.hours(2);

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
  SetAnimationRequestFrequency,
  SetAnimationPlayMode,
  SetDefaultAnimationSpeed } = D.taggedEnum<Action>();


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

    // TODO: Update view if outside of current view range
    SetSelectedStartDateTime: (x) => {
      const start = x.selectedStartDateTime;
      const end = DateTime.addDuration(start, state.selectedDuration);

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
    SetDefaultAnimationSpeed: (x) => ({
      ...state,
      resetAnimationSpeed: x.defaultAnimationSpeed,
    }),

    ResetAll: () => ({
      ...state,
      viewStartDateTime: state.resetStartDateTime,
      viewDuration: state.resetDuration,
      selectedStartDateTime: state.resetStartDateTime,
      selectedDuration: state.resetDuration,
      animationOrStepMode: AnimationOrStepMode.Step,
      animationStartDateTime: state.resetStartDateTime,
      animationDuration: state.resetAnimationDuration,
      animationPlayMode: PlayMode.Pause,
      animationSpeed: state.resetAnimationSpeed,
    }),
  })(action);


/**
 * Component
 */

export const TimeRangeSlider = ({
  externalStartDate = new Date(),
  initialDuration = TimeDuration['10m'],
  viewIncrement = TimeDuration['5m'],
  onDateRangeSelect,
  animationRequestFrequency = AnimationRequestFrequency['1 fps'],
  className = "",
}: TimeRangeSliderProps) => {

  /**
   * Initialize the start and end dates for the range calendar.
   * If no dates are provided, use the current date and a 1 hour range.
   */
  const [externalStartDateTime, setExternalStartDateTime] = useState<DateTime.DateTime>(DateTime.unsafeFromDate(new Date(externalStartDate)));
  useEffect(() => {
    const newStartDateTime: DateTime.DateTime = O.fromNullable(externalStartDate).pipe(
      O.flatMap(DateTime.make),
      O.getOrElse(() => {
        console.warn(
          "No start date for range or invalide date provided, using current date.");
        return DateTime.unsafeFromDate(new Date()) as DateTime.DateTime;
      }));
    setExternalStartDateTime(newStartDateTime);
  }, [externalStartDate, initialDuration]);

  /**
   * Update local state with initial start and end dates.
   */
  const defaultViewDuration = Duration.days(7);
  const defaultDuration = Duration.millis(initialDuration);
  const startViewDateTime = roundDateTimeDownToNearestFiveMinutes(externalStartDateTime);
  const [s, d] = useReducer(reducer, {
    viewDuration: defaultViewDuration,
    viewStartDateTime: startViewDateTime,
    viewEndDateTime: DateTime.addDuration(startViewDateTime, defaultViewDuration), // Default view duration of 7 days

    defaultStartDateTime: externalStartDateTime,
    defaultDuration,

    selectedStartDateTime: externalStartDateTime,
    selectedDuration: defaultDuration,

    animationState: AnimationInactive(),
    defaultAnimationSpeed: AnimationSpeed['5 min/sec'],
    animationRequestFrequency,
  });

  useEffect(() => {
    d(SetDefaultStartDateTimeAndDuration({
      defaultStartDateTime: externalStartDateTime,
      defaultDuration,
    }));
    d(SetViewStartAndEndDateTimes({
      viewStartDateTime: externalStartDateTime,
      viewEndDateTime: DateTime.addDuration(externalStartDateTime, s.viewDuration),
    }));
    d(SetSelectedDateTimeAndDuration({
      start: externalStartDateTime,
      duration: defaultDuration,
    }));
    // Omit defaultDuration to prevent endless loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalStartDate]);

  /**
   * Update view duration based on the width of the slider.
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
  }, [d]);

  /**
   * Determine primary and sub-ranges for the calendar.
   */
  const selectedRangeWithCallbackWrapper = ({ start, duration }: { start: DateTime.DateTime, duration: Duration.Duration }) => {
    // Side-effect to call the onDateRangeSelect callback
    const jsStartDate = DateTime.toDate(start);
    const jsEndDate = DateTime.toDate(DateTime.addDuration(start, duration));
    onDateRangeSelect({ start: jsStartDate, end: jsEndDate });

    return d(SetSelectedDateTimeAndDuration({
      start,
      duration
    }));
  }

  const selectedRangeToDurationWrapper = (dateRange: RangeValue<DateTime.DateTime>) => {
    return selectedRangeWithCallbackWrapper({
      start: dateRange.start,
      duration: DateTime.distanceDuration(dateRange.start, dateRange.end)
    });
  }

  const [primaryRange, setPrimaryRange] = useState<PrimaryRange<DateTime.DateTime>>({
    start: s.selectedStartDateTime,
    end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
    set: selectedRangeToDurationWrapper,
    duration: s.selectedDuration,
  });
  const [subRanges, setSubRanges] = useState<SubRange<DateTime.DateTime>[]>([]);

  /* Update range based on animation vs. step mode */
  useEffect(() => {
    $animationMatch({
      AnimationInactive: () => {
        setPrimaryRange({
          start: s.selectedStartDateTime,
          end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
          set: selectedRangeToDurationWrapper,
          duration: s.selectedDuration,
        });
        setSubRanges([]);
      },
      AnimationActive: (aState) => {
        setPrimaryRange({
          start: aState.animationStartDateTime,
          end: DateTime.addDuration(aState.animationStartDateTime, aState.animationDuration),
          set: (dateRange: RangeValue<DateTime.DateTime>) => {
            d(SetAnimationState({
              animationState: AnimationActive({
                animationStartDateTime: dateRange.start,
                animationDuration: DateTime.distanceDuration(dateRange.start, dateRange.end),
                animationPlayMode: aState.animationPlayMode,
                animationSpeed: aState.animationSpeed,
              }),
            }));
            selectedRangeWithCallbackWrapper({
              start: dateRange.start,
              duration: s.selectedDuration,
            });
          },
          duration: aState.animationDuration,
        });
        setSubRanges([{
          start: s.selectedStartDateTime,
          end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
          set: (dateRange: RangeValue<DateTime.DateTime>) => {
            selectedRangeWithCallbackWrapper({
              start: dateRange.start,
              duration: DateTime.distanceDuration(dateRange.start, dateRange.end)
            });
          },
          active: false,
        }]);
      },
    })(s.animationState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.animationState, s.selectedDuration, s.selectedStartDateTime]);

  /* Repeatedly update if animation active and playing */
  useEffect(() => {
    match(s.animationState)
      .with({ _tag: 'AnimationActive', animationPlayMode: PlayMode.Play }, ({ animationSpeed }) => animationSpeed > 0, ({
        animationStartDateTime,
        animationDuration,
        animationSpeed
      }) => {
        const jumpDuration = Duration.millis((s.animationRequestFrequency / 1000) * animationSpeed);
        const animationEndDateTime = DateTime.addDuration(animationStartDateTime, animationDuration);
        const nextSelectedStartDateTime = DateTime.addDuration(
          s.selectedStartDateTime,
          jumpDuration);
        const nextSelectedEndDateTime = DateTime.addDuration(
          nextSelectedStartDateTime,
          s.selectedDuration);
        const newSelectedStartDateTime = DateTime.greaterThan(nextSelectedEndDateTime, animationEndDateTime)
          ? animationStartDateTime
          : nextSelectedStartDateTime;

        const action = () => {
          selectedRangeWithCallbackWrapper({
            start: newSelectedStartDateTime,
            duration: s.selectedDuration,
          })
        };
        // Wait 1 second then update state
        const program = E.delay(E.sync(action), Duration.millis(s.animationRequestFrequency));
        // Run the program and log the number of repetitions
        E.runPromise(program).then();
      })
      .with({ _tag: 'AnimationActive', animationPlayMode: PlayMode.Play }, ({
        animationStartDateTime,
        animationDuration,
        animationSpeed
      }) => {
        const jumpDuration = Duration.millis(Math.abs((s.animationRequestFrequency / 1000) * animationSpeed));
        const nextSelectedStartDateTime = DateTime.subtractDuration(
          s.selectedStartDateTime,
          jumpDuration);
        const nextSelectedEndDateTime = DateTime.addDuration(
          nextSelectedStartDateTime,
          s.selectedDuration);
        const animationEndDateTime = DateTime.addDuration(animationStartDateTime, animationDuration);
        const newSelectedStartDateTime = DateTime.lessThan(nextSelectedEndDateTime, animationStartDateTime)
          ? DateTime.subtractDuration(animationEndDateTime, s.selectedDuration)
          : nextSelectedStartDateTime;

        const action = () => {
          selectedRangeWithCallbackWrapper({
            start: newSelectedStartDateTime,
            duration: s.selectedDuration,
          })
        };
        // Wait 1 second then update state
        const program = E.delay(E.sync(action), Duration.seconds(1));
        // Run the program and log the number of repetitions
        E.runPromise(program).then();
      })
      .otherwise(() => { /* no-op */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.animationState, s.selectedDuration, s.selectedStartDateTime]);

  return (
    <div ref={sliderRef} className={`${className} time-range-slider`}>
      <button className="next-prev-date-range">
        <IoIosArrowBack
          onClick={() => {
            const newStart = DateTime.subtractDuration(
              s.viewStartDateTime, s.viewDuration);
            const newEnd = s.viewStartDateTime;
            d(SetViewStartAndEndDateTimes({
              viewStartDateTime: newStart,
              viewEndDateTime: newEnd,
            }));
          }}
          title='Previous'
        />
      </button>
      <div className={"horizontal-calendar-grid-body"} >
        <HorizontalCalendar
          increment={viewIncrement}
          primaryRange={primaryRange}
          subRanges={subRanges}
          viewRange={{ start: s.viewStartDateTime, end: s.viewEndDateTime }}
        />
      </div>
      <button className="next-prev-date-range">
        <IoIosArrowForward
          onClick={() => {
            const newEnd = DateTime.addDuration(
              s.viewEndDateTime, s.viewDuration);
            const newStart = s.viewEndDateTime;
            d(SetViewStartAndEndDateTimes({
              viewStartDateTime: newStart,
              viewEndDateTime: newEnd,
            }));
          }}
          title='Next'
        />
      </button>
      <DateAndRangeSelect
        startDateTime={s.selectedStartDateTime}
        setStartDateTime={(date: DateTime.DateTime) => {
          selectedRangeWithCallbackWrapper({
            start: date,
            duration: DateTime.distanceDuration(date, DateTime.addDuration(date, s.selectedDuration))
          });
          d(SetViewStartAndEndDateTimes({
            viewStartDateTime: date,
            viewEndDateTime: DateTime.addDuration(date, s.viewDuration),
          }));
        }}
        returnToDefaultDateTime={() => {
          selectedRangeWithCallbackWrapper({
            start: s.defaultStartDateTime,
            duration: s.selectedDuration,
          });
          d(SetViewStartAndEndDateTimes({
            viewStartDateTime: s.defaultStartDateTime,
            viewEndDateTime: DateTime.addDuration(s.defaultStartDateTime, s.viewDuration),
          }));
          match(s.animationState)
            .with({ _tag: 'AnimationActive' }, (aState) => {
              d(SetAnimationState({
                animationState: AnimationActive({
                  ...aState,
                  animationStartDateTime: s.defaultStartDateTime,
                  animationPlayMode: PlayMode.Pause,
                })
              }));
            })
        }}
        rangeValue={TimeDuration[Duration.toMillis(s.selectedDuration)]
          ? Duration.toMillis(s.selectedDuration) as TimeDuration : undefined}
        setRange={(timeDuration: TimeDuration) =>
          selectedRangeWithCallbackWrapper({
            start: s.selectedStartDateTime,
            duration: Duration.millis(timeDuration),
          })
        }
      />
      <Divider variant="middle" orientation={"vertical"} flexItem />
      <AnimateAndStepControls
        /* Step controls */
        incrementStartDateTime={() => {
          selectedRangeWithCallbackWrapper({
            start: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
            duration: s.selectedDuration,
          });
        }}
        decrementStartDateTime={() => {
          selectedRangeWithCallbackWrapper({
            start: DateTime.subtractDuration(s.selectedStartDateTime, s.selectedDuration),
            duration: s.selectedDuration,
          });
        }}

        /* Animation toggle */
        animationEnabled={s.animationState._tag === 'AnimationActive'}
        setAnimationEnabled={(enabled: boolean) => {
          d(SetAnimationState({
            animationState: enabled
              ? AnimationActive({
                animationStartDateTime: s.selectedStartDateTime,
                animationDuration: DEFAULT_ANIMATION_DURATION,
                animationPlayMode: PlayMode.Pause,
                animationSpeed: s.defaultAnimationSpeed,
              })
              : AnimationInactive(),
          }));
        }}

        /* Play toggle */
        playMode={s.animationState._tag === 'AnimationActive'
          ? s.animationState.animationPlayMode
          : PlayMode.Pause}
        setPlayMode={(mode: PlayMode) => {
          d(SetPlayMode({ playMode: mode }));
        }}

        /* Animation speed settings */
        animationSpeed={s.animationState._tag === 'AnimationActive'
          ? s.animationState.animationSpeed
          : s.defaultAnimationSpeed}
        setAnimationSpeed={(speed: AnimationSpeed) => {
          d(SetAnimationState({
            animationState: $animationMatch({
              AnimationInactive: () => s.animationState,
              AnimationActive: (active) => AnimationActive({
                ...active,
                animationSpeed: speed,
              }),
            })(s.animationState),
          }));
        }}
        incrementAnimationSpeed={() => {
          const animationSpeed = s.animationState._tag === 'AnimationActive'
            ? s.animationState.animationSpeed
            : s.defaultAnimationSpeed;
          const newSpeed = match(animationSpeed)
            .with(AnimationSpeed['-1 hour/sec'], () => AnimationSpeed['-30 min/sec'])
            .with(AnimationSpeed['-30 min/sec'], () => AnimationSpeed['-10 min/sec'])
            .with(AnimationSpeed['-10 min/sec'], () => AnimationSpeed['-5 min/sec'])
            .with(AnimationSpeed['-5 min/sec'], () => AnimationSpeed['-1 min/sec'])
            .with(AnimationSpeed['-1 min/sec'], () => AnimationSpeed['1 min/sec'])
            .with(AnimationSpeed['1 min/sec'], () => AnimationSpeed['5 min/sec'])
            .with(AnimationSpeed['5 min/sec'], () => AnimationSpeed['10 min/sec'])
            .with(AnimationSpeed['10 min/sec'], () => AnimationSpeed['30 min/sec'])
            .with(AnimationSpeed['30 min/sec'], () => AnimationSpeed['1 hour/sec'])
            .with(AnimationSpeed['1 hour/sec'], () => AnimationSpeed['1 min/sec'])
            .otherwise(() => animationSpeed);
          d(SetAnimationState({
            animationState: $animationMatch({
              AnimationInactive: () => s.animationState,
              AnimationActive: (active) => AnimationActive({
                ...active,
                animationSpeed: newSpeed,
              }),
            })(s.animationState),
          }));
        }}
        decrementAnimationSpeed={() => {
          const animationSpeed = s.animationState._tag === 'AnimationActive'
            ? s.animationState.animationSpeed
            : s.defaultAnimationSpeed;
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
          d(SetAnimationState({
            animationState: $animationMatch({
              AnimationInactive: () => s.animationState,
              AnimationActive: (active) => AnimationActive({
                ...active,
                animationSpeed: newSpeed,
              }),
            })(s.animationState),
          }));
        }}
      />
    </div>
  );
}
