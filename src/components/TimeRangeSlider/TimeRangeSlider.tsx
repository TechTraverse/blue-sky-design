import './timeRangeSlider.css';
import { useEffect, useReducer, useRef } from 'react';
import type { RangeValue } from "@react-types/shared";
import { DateTime, Option as O, Data as D, Duration } from 'effect';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { RangeCalendar } from 'react-aria-components';
import { createCalendar, parseDate } from '@internationalized/date';
import { useLocale, useRangeCalendar } from 'react-aria';
import { useRangeCalendarState, type RangeCalendarState } from 'react-stately';
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';
import { RangeDateInput } from './RangeDateInput';
import { $animationMatch, AnimationActive, AnimationInactive, TimeDuration, type AnimationState } from './timeSliderTypes';

export interface TimeRangeSliderProps {
  initialStartDate?: Date;
  initialDuration?: TimeDuration;
  increment?: TimeDuration;
  onDateRangeSelect?: () => void;
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
  }
  Reset: object;
}>;

const {
  $match: $actionMatch,
  SetViewDuration,
  SetViewStartAndEndDateTimes,
  SetSelectedDateTimeAndDuration,
  SetAnimationState } = D.taggedEnum<Action>();


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
    SetViewStartAndEndDateTimes: (x) => ({
      ...state,
      ...x,
    }),
    SetSelectedDateTimeAndDuration: (x) => ({
      ...state,
      selectedStartDateTime: x.start,
      selectedDuration: x.duration,
    }),
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
  initialStartDate,
  initialDuration = TimeDuration['5m'],
  increment = TimeDuration['5m'],
  onDateRangeSelect,
}: TimeRangeSliderProps) => {

  const { locale } = useLocale();

  /**
   * Initialize the start and end dates for the range calendar.
   * If no dates are provided, use the current date and a 1 hour range.
   */
  const initStartDateTime: DateTime.DateTime = O.fromNullable(initialStartDate).pipe(
    O.flatMap(DateTime.make),
    O.getOrElse(() => {
      console.warn(
        "No start date for range or invalide date provided, using current date.");
      return DateTime.unsafeFromDate(new Date()) as DateTime.DateTime;
    }));

  const initEndDateTime: DateTime.DateTime = DateTime.add(initStartDateTime, { millis: initialDuration });

  /**
   * Update local state with initial start and end dates.
   */
  const defaultViewDuration = Duration.days(7);
  const defaultDuration = Duration.millis(initialDuration);
  const [s, d] = useReducer(reducer, {
    viewDuration: defaultViewDuration,
    viewStartDateTime: initStartDateTime,
    viewEndDateTime: DateTime.addDuration(initStartDateTime, defaultViewDuration), // Default view duration of 7 days

    defaultStartDateTime: initStartDateTime,
    defaultDuration,

    selectedStartDateTime: initStartDateTime,
    selectedDuration: defaultDuration,

    animationState: AnimationInactive(),
  });

  /**
   * Calendar ref, state, and props for the range calendar.
   */
  const rangeCalendarRef = useRef<HTMLDivElement>(null);
  const rangeCalendarState: RangeCalendarState = useRangeCalendarState({
    value: {
      start: parseDate(DateTime.formatIsoDate(initStartDateTime)),
      end: parseDate(DateTime.formatIsoDate(initEndDateTime)),
    },
    createCalendar,
    locale
  });
  const { calendarProps, prevButtonProps, nextButtonProps } = useRangeCalendar({}, rangeCalendarState, rangeCalendarRef);
  useEffect(() => {
    rangeCalendarState.setValue({
      start: parseDate(DateTime.formatIsoDate(s.selectedStartDateTime)),
      end: parseDate(DateTime.formatIsoDate(DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration))),
    });
  }, [
    s.selectedStartDateTime,
    s.selectedDuration,
    rangeCalendarState]);

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
  }, []);

  return (
    <div {...calendarProps} ref={sliderRef} className="time-range-slider">
      <button className="next-prev-date-range" {...prevButtonProps}>
        <IoIosArrowBack
          onClick={() => {
            const newStart = DateTime.subtractDuration(
              s.viewStartDateTime, s.viewDuration);
            const newEnd = s.viewStartDateTime;
            d(SetViewStartAndEndDateTimes({
              viewStartDateTime: newStart,
              viewEndDateTime: newEnd,
            }));
            if (onDateRangeSelect) {
              onDateRangeSelect();
            }
          }}
          title='Previous'
        />
      </button>
      <RangeCalendar
        ref={rangeCalendarRef}
        className={"horizontal-calendar-grid-body"}
        defaultValue={{
          start: parseDate(DateTime.formatIsoDate(s.selectedStartDateTime)),
          end: parseDate(DateTime.formatIsoDate(DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration))),
        }}
        aria-label="Range dates"
        visibleDuration={{ days: Duration.toDays(s.viewDuration) }}>
        {/* <HorizontalCalendarGrid offset={{ months: 0 }} /> */}
        <HorizontalCalendar
          increment={increment}
          duration={s.selectedDuration}
          selectedDateRange={{
            start: s.selectedStartDateTime,
            end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
          }}
          setSelectedDateRange={
            (dateRange: RangeValue<DateTime.DateTime>) => {
              d(SetSelectedDateTimeAndDuration({
                start: dateRange.start,
                duration: DateTime.distanceDuration(dateRange.start, dateRange.end)
              }));
            }}
          setAnimationActive={(active: boolean) => {
            d(SetAnimationState({
              animationState: active
                ? AnimationActive({
                  animationStartDateTime: s.viewStartDateTime,
                  animationDuration: DEFAULT_ANIMATION_DURATION,
                })
                : AnimationInactive(),
            }));
          }}
          setAnimationDateRange={(dateRange: RangeValue<DateTime.DateTime>) => {
            d(SetAnimationState({
              animationState: AnimationActive({
                animationStartDateTime: dateRange.start,
                animationDuration: DateTime.distanceDuration(dateRange.start, dateRange.end),
              }),
            }));
          }}
          animationState={s.animationState}
          viewStartDateTime={s.viewStartDateTime}
          viewEndDateTime={s.viewEndDateTime}

        />
      </RangeCalendar>
      <button className="next-prev-date-range" {...nextButtonProps}>
        <IoIosArrowForward
          onClick={() => {
            const newEnd = DateTime.addDuration(
              s.viewEndDateTime, s.viewDuration);
            const newStart = s.viewEndDateTime;
            d(SetViewStartAndEndDateTimes({
              viewStartDateTime: newStart,
              viewEndDateTime: newEnd,
            }));
            if (onDateRangeSelect) {
              onDateRangeSelect();
            }
          }}
          title='Next'
        />
      </button>
      <RangeDateInput
        startDateTime={s.selectedStartDateTime}
        setStartDateTime={(date: DateTime.DateTime) => {
          d(SetSelectedDateTimeAndDuration({
            start: date,
            duration: DateTime.distanceDuration(date, DateTime.addDuration(date, s.selectedDuration))
          }));
          d(SetViewStartAndEndDateTimes({
            viewStartDateTime: date,
            viewEndDateTime: DateTime.addDuration(date, s.viewDuration),
          }));
        }}
      />
    </div>
  );
}
