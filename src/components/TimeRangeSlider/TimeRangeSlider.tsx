import './timeRangeSlider.css';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Option as O, Data as D, Duration, Effect as E } from 'effect';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';
import { AnimateAndStepControls } from './AnimateAndStepControls';
import { $animationMatch, AnimationActive, AnimationInactive, AnimationRequestFrequency, AnimationSpeed, PlayMode, TimeDuration, type AnimationState, type PrimaryRange, type SubRange } from './timeSliderTypes';
import { DateAndRangeSelect } from './DateAndRangeSelect';
import { Divider } from '@mui/material';

export interface TimeRangeSliderProps {
  externalStartDate?: Date;
  initialDuration?: TimeDuration;
  viewIncrement?: TimeDuration;
  onDateRangeSelect: ({
    start,
    end
  }: {
    start: Date;
    end: Date;
  }) => void;
  animationRequestFrequency?: AnimationRequestFrequency;
  className?: string;
}

type State = {
  // The current viewable range of dates
  viewStartDateTime: DateTime.DateTime;
  viewEndDateTime: DateTime.DateTime;
  viewDuration: Duration.Duration;

  // Default date range on init, also what to reset to
  defaultStartDateTime: DateTime.DateTime;
  defaultDuration: Duration.Duration;

  // User-selected date range
  selectedStartDateTime: DateTime.DateTime;
  selectedDuration: Duration.Duration;

  // Animation state for the calendar
  animationState: AnimationState;
  defaultAnimationSpeed: AnimationSpeed;
  animationRequestFrequency: AnimationRequestFrequency;
};

type Action = D.TaggedEnum<{
  SetViewDuration: { viewDuration: Duration.Duration; };
  SetViewStartAndEndDateTimes: {
    viewStartDateTime: DateTime.DateTime;
    viewEndDateTime: DateTime.DateTime;
  }
  SetDefaultStartDateTimeAndDuration: {
    defaultStartDateTime: DateTime.DateTime;
    defaultDuration: Duration.Duration;
  };
  SetSelectedDateTimeAndDuration: {
    start: DateTime.DateTime;
    duration: Duration.Duration;
  };
  SetAnimationState: {
    animationState: AnimationState;
  };
  SetPlayMode: {
    playMode: PlayMode;
  };
  Reset: object;
}>;

const {
  $match: $actionMatch,
  SetViewDuration,
  SetDefaultStartDateTimeAndDuration,
  SetViewStartAndEndDateTimes,
  SetSelectedDateTimeAndDuration,
  SetAnimationState, SetPlayMode } = D.taggedEnum<Action>();

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

const reducer = (state: State, action: Action): State =>
  $actionMatch({
    SetViewDuration: (x) => ({
      ...state,
      viewDuration: x.viewDuration,
      viewEndDateTime: DateTime.addDuration(state.viewStartDateTime, x.viewDuration),
    }),
    SetDefaultStartDateTimeAndDuration: (x) => ({
      ...state,
      ...x,
    }),
    SetViewStartAndEndDateTimes: ({ viewStartDateTime, viewEndDateTime }) => {
      const roundedViewStart = roundDateTimeDownToNearestFiveMinutes(viewStartDateTime);
      const roundedViewEnd = roundDateTimeDownToNearestFiveMinutes(viewEndDateTime);
      const newViewDuration = DateTime.distanceDuration(roundedViewStart, roundedViewEnd);

      return {
        ...state,
        viewStartDateTime: roundedViewStart,
        viewEndDateTime: roundedViewEnd,
        viewDuration: newViewDuration,
      }
    },
    SetSelectedDateTimeAndDuration: (x) => {
      const updatedViewTimes = DateTime.lessThan(x.start, state.viewStartDateTime)
        ? {
          viewStartDateTime:
            DateTime.subtractDuration(x.start, Duration.hours(1)).pipe(roundDateTimeDownToNearestFiveMinutes),
          viewEndDateTime: DateTime.addDuration(DateTime.subtractDuration(x.start, Duration.hours(1)), state.viewDuration).pipe(roundDateTimeDownToNearestFiveMinutes)
        }
        : DateTime.greaterThan(DateTime.addDuration(x.start, x.duration), state.viewEndDateTime)
          ? {
            viewStartDateTime:
              DateTime.addDuration(x.start, Duration.hours(1)).pipe(roundDateTimeDownToNearestFiveMinutes),
            viewEndDateTime: DateTime.addDuration(DateTime.addDuration(x.start, Duration.hours(1)), state.viewDuration).pipe(roundDateTimeDownToNearestFiveMinutes)
          }
          : {};

      return ({
        ...state,
        ...updatedViewTimes,
        selectedStartDateTime: x.start,
        selectedDuration: x.duration,
      })
    },
    SetAnimationState: (x) => {
      const { animationState } = x;
      return $animationMatch({
        AnimationInactive: () => ({
          ...state,
          animationState: AnimationInactive(),
        }),
        AnimationActive: (active) => ({
          ...state,
          animationState: AnimationActive(active),
        }),
      })(animationState);
    },
    SetPlayMode: (x) => ({
      ...state,
      animationState: $animationMatch({
        AnimationInactive: () => state.animationState,
        AnimationActive: (active) => AnimationActive({
          ...active,
          animationPlayMode: x.playMode,
        }),
      })(state.animationState),
    }),
    Reset: () => ({
      ...state,
      selectedStartDateTime: state.defaultStartDateTime,
      selectedDuration: state.defaultDuration,
      viewStartDateTime: state.defaultStartDateTime,
      viewEndDateTime: DateTime.addDuration(state.defaultStartDateTime, state.viewDuration),
      animationState: AnimationInactive(),
    }),
  })(action);

const widthToDuration: (width: number) => Duration.Duration = (width) => match(width)
  .with(P.number.lt(350), () => Duration.hours(1))
  .with(P.number.lt(700), () => Duration.hours(2))
  .with(P.number.lt(1050), () => Duration.hours(3))
  .with(P.number.lt(1400), () => Duration.hours(4))
  .with(P.number.lt(1750), () => Duration.hours(5))
  .with(P.number.lt(2100), () => Duration.hours(6))
  .otherwise(() => Duration.hours(21));

const DEFAULT_ANIMATION_DURATION = Duration.hours(2);

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
  const [externalStartDateTime, setExternalStartDateTime] = useState<DateTime.DateTime>(DateTime.unsafeFromDate(externalStartDate));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalStartDateTime, defaultDuration]);

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
