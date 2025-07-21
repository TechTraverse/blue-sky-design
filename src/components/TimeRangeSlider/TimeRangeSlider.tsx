import './timeRangeSlider.css';
import { useEffect, useReducer, useRef, useState } from 'react';
import { DateTime, Option as O, Data as D, Duration } from 'effect';
import { Button } from '../Button';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { RangeCalendar } from 'react-aria-components';
import { createCalendar, parseDate } from '@internationalized/date';
import { useLocale, useRangeCalendar } from 'react-aria';
import { useRangeCalendarState, type RangeCalendarState } from 'react-stately';
import { HorizontalCalendar } from './HorizontalCalendar';
import { match, P } from 'ts-pattern';

export interface TimeRangeSliderProps {
  initialStartDate?: Date;
  initialEndDate?: Date;
  onDateRangeSelect?: () => void;
}

type State = {
  viewDuration: { days: number };
  viewStartDateTime: DateTime.Utc;
  initEndDateTime: DateTime.Utc;
  initStartDateTime: DateTime.Utc;
  endDateTime: DateTime.Utc;
  startDateTime: DateTime.Utc;
};

type Action = D.TaggedEnum<{
  SetViewStartTime: {
    viewStartDateTime: DateTime.Utc;
  }
  SetViewDuration: { days: number };
  SetInitialDates: {
    initStartDateTime: DateTime.Utc;
    initEndDateTime: DateTime.Utc;
  };
  SelectDateRange: { start: DateTime.Utc; end: DateTime.Utc };
  Reset: object;
}>;

const { $match, SetViewDuration } = D.taggedEnum<Action>();

const reducer = (state: State, action: Action): State =>
  $match({
    SetViewStartTime: ({ viewStartDateTime }) => ({
      ...state,
      viewStartDateTime,
    }),
    SetViewDuration: ({ days }) => ({
      ...state,
      viewDuration: { days },
    }),
    SetInitialDates: ({ initStartDateTime, initEndDateTime }) => ({
      ...state,
      initStartDateTime,
      initEndDateTime,
    }),
    SelectDateRange: ({ start, end }) => ({
      ...state,
      endDateTime: end,
      startDateTime: start,
    }),
    Reset: () => ({
      ...state,
      endDateTime: state.initEndDateTime,
      startDateTime: state.initStartDateTime,
    }),
  })(action);

export const TimeRangeSlider = ({
  initialStartDate,
  initialEndDate,
  onDateRangeSelect,
}: TimeRangeSliderProps) => {

  const { locale } = useLocale();

  /**
   * Initialize the start and end dates for the range calendar.
   * If no dates are provided, use the current date and a 1 hour range.
   */
  const initEndDateTime = O.fromNullable(initialEndDate).pipe(
    O.flatMap(DateTime.make),
    O.getOrElse(() => {
      console.warn(
        "No end date or invalide date provided, using current date instead.");
      return DateTime.unsafeMake(new Date());
    }));
  const initStartDateTime = O.fromNullable(initialStartDate).pipe(
    O.flatMap(DateTime.make),
    O.getOrElse(() => {
      console.warn(
        "No start date for range or invalide date provided, using 1 hour date range.");
      return DateTime.subtract(initEndDateTime, { hours: 1 });
    }));

  /**
   *  State defaults
   */
  const viewDuration = { days: 7 };
  const viewStartDateTime = initStartDateTime;

  /**
   * Update local state with initial start and end dates.
   */
  const [s, d] = useReducer(reducer, {
    viewDuration,
    viewStartDateTime,
    initEndDateTime,
    initStartDateTime,
    endDateTime: initEndDateTime,
    startDateTime: initStartDateTime,
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
      start: parseDate(DateTime.formatIsoDate(s.startDateTime)),
      end: parseDate(DateTime.formatIsoDate(s.endDateTime)),
    });
  }, [s.startDateTime, s.endDateTime, rangeCalendarState]);

  /**
   * Update view duration based on the width of the slider.
   */
  const sliderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        match(width)
          .with(P.number.lt(350), () => d(SetViewDuration({ days: 7 })))
          .with(P.number.lt(700), () => d(SetViewDuration({ days: 14 })))
          .with(P.number.lt(1050), () => d(SetViewDuration({ days: 21 })))
          .with(P.number.lt(1400), () => d(SetViewDuration({ days: 28 })))
          .with(P.number.lt(1750), () => d(SetViewDuration({ days: 35 })))
          .otherwise(() => d(SetViewDuration({ days: 42 })));
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
      <Button primary={true} className="next-prev-date-range" {...prevButtonProps}>
        <IoIosArrowBack
          onClick={() => console.log("Last date range")}
          title='Previous'
        />
      </Button>
      <RangeCalendar
        ref={rangeCalendarRef}
        defaultValue={{
          start: parseDate(DateTime.formatIsoDate(s.startDateTime)),
          end: parseDate(DateTime.formatIsoDate(s.endDateTime)),
        }}
        aria-label="Trip dates"
        visibleDuration={s.viewDuration}>
        {/* <HorizontalCalendarGrid offset={{ months: 0 }} /> */}
        <HorizontalCalendar state={rangeCalendarState} viewStartDateTime={s.viewStartDateTime} duration={Duration.days(s.viewDuration.days)} />
      </RangeCalendar>
      <Button primary={true} className="next-prev-date-range" {...nextButtonProps}>
        <IoIosArrowForward
          onClick={() => console.log("Next date range")}
          title='Next'
        />
      </Button>
    </div>
  );
}
