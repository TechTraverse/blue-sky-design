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
import { TimeDuration } from './timeSliderTypes';
import type { Unit } from 'effect/Duration';

export interface TimeRangeSliderProps {
  initialStartDate?: Date;
  initialDuration?: TimeDuration;
  onDateRangeSelect?: () => void;
}

type State = {
  // The duration of the view in days
  viewDuration: Duration.Duration;

  // The current viewable range of dates
  viewStartDateTime: DateTime.DateTime;
  viewEndDateTime: DateTime.DateTime;

  // Default date range on init, also what to reset to
  defaultStartDateTime: DateTime.DateTime;
  defaultDuration: Duration.Duration;

  // User-selected date range
  selectedStartDateTime: DateTime.DateTime;
  selectedDuration: Duration.Duration;
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
  Reset: object;
}>;

const {
  $match,
  SetViewDuration,
  SetViewStartAndEndDateTimes,
  SetSelectedDateTimeAndDuration } = D.taggedEnum<Action>();


const reducer = (state: State, action: Action): State =>
  $match({
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
    Reset: () => ({
      ...state,
      selectedStartDateTime: state.defaultStartDateTime,
      selectedDuration: state.defaultDuration,
      viewStartDateTime: state.defaultStartDateTime,
      viewEndDateTime: DateTime.addDuration(state.defaultStartDateTime, state.viewDuration),
    }),
  })(action);

const widthToDuration: (width: number) => Duration.Duration = (width) => match(width)
  .with(P.number.lt(350), () => Duration.hours(3))
  .with(P.number.lt(700), () => Duration.hours(6))
  .with(P.number.lt(1050), () => Duration.hours(9))
  .with(P.number.lt(1400), () => Duration.hours(12))
  .with(P.number.lt(1750), () => Duration.hours(15))
  .with(P.number.lt(2100), () => Duration.hours(18))
  .otherwise(() => Duration.hours(21));

export const TimeRangeSlider = ({
  initialStartDate,
  initialDuration = TimeDuration['5m'],
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
        "No start date for range or invalide date provided, using 1 hour date range.");
      return DateTime.subtract(initEndDateTime, { hours: 1 }) as DateTime.DateTime;
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

  /**
   * Update view range based upon newly selected date range.
   */
  useEffect(() => {
    d(SetViewStartAndEndDateTimes({
      viewStartDateTime: s.selectedStartDateTime,
      viewEndDateTime: DateTime.addDuration(s.selectedStartDateTime, s.viewDuration),
    }));
  }, [s.selectedStartDateTime, s.viewDuration]);

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
          setSelectedDateRange={
            (dateRange: RangeValue<DateTime.DateTime>) => {
              d(SetSelectedDateTimeAndDuration({
                start: dateRange.start,
                duration: DateTime.distanceDuration(dateRange.start, dateRange.end)
              }));
            }}
          selectedDateRange={{
            start: s.selectedStartDateTime,
            end: DateTime.addDuration(s.selectedStartDateTime, s.selectedDuration),
          }}
          viewStartDateTime={s.viewStartDateTime}
          viewEndDateTime={s.viewEndDateTime} />
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
        }}
      />
    </div>
  );
}
