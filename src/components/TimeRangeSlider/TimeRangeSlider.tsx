import './timeRangeSlider.css';
import { useEffect, useReducer, useRef } from 'react';
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
  // The duration of the view in days
  viewDuration: Duration.Duration;

  // The current viewable range of dates
  viewStartDateTime: DateTime.Utc;
  viewEndDateTime: DateTime.Utc;

  // Default date range on init, also what to reset to
  defaultStartDateTime: DateTime.Utc;
  defaultEndDateTime: DateTime.Utc;

  // User-selected date range
  selectedStartDateTime: DateTime.Utc;
  selectedEndDateTime: DateTime.Utc;
};

type Action = D.TaggedEnum<{
  SetViewDuration: { viewDuration: Duration.Duration; };
  SetViewStartAndEndDateTimes: {
    viewStartDateTime: DateTime.Utc;
    viewEndDateTime: DateTime.Utc;
  }
  SetDefaultStartAndEndDateTimes: {
    defaultStartDateTime: DateTime.Utc;
    defaultEndDateTime: DateTime.Utc;
  };
  SetSelectedStartDateTime: { selectedStartDateTime: DateTime.Utc; };
  SetSelectedEndDateTime: { selectedEndDateTime: DateTime.Utc; };
  Reset: object;
}>;

const { $match, SetViewDuration, SetDefaultStartAndEndDateTimes, SetViewStartAndEndDateTimes, SetSelectedStartDateTime, SetSelectedEndDateTime } = D.taggedEnum<Action>();


const reducer = (state: State, action: Action): State =>
  $match({
    SetViewDuration: (x) => ({
      ...state,
      viewDuration: x.viewDuration,
      viewEndDateTime: DateTime.addDuration(state.viewStartDateTime, x.viewDuration),
    }),
    SetDefaultStartAndEndDateTimes: (x) => ({
      ...state,
      ...x,
    }),
    SetViewStartAndEndDateTimes: (x) => ({
      ...state,
      ...x,
    }),
    SetSelectedStartDateTime: (x) => ({
      ...state,
      ...x,
    }),
    SetSelectedEndDateTime: (x) => ({
      ...state,
      ...x,
    }),
    Reset: () => ({
      ...state,
      selectedStartDateTime: state.defaultStartDateTime,
      selectedEndDateTime: state.defaultEndDateTime,
    }),
  })(action);

const widthToDuration = (width: number) => match(width)
  .with(P.number.lt(350), () => ({ days: 7 }))
  .with(P.number.lt(700), () => ({ days: 14 }))
  .with(P.number.lt(1050), () => ({ days: 21 }))
  .with(P.number.lt(1400), () => ({ days: 28 }))
  .with(P.number.lt(1750), () => ({ days: 35 }))
  .otherwise(() => ({ days: 42 }));

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
   * Update local state with initial start and end dates.
   */
  const defaultViewDuration = Duration.days(7);
  const [s, d] = useReducer(reducer, {
    viewDuration: defaultViewDuration,
    viewStartDateTime: initStartDateTime,
    viewEndDateTime: DateTime.addDuration(initStartDateTime, defaultViewDuration), // Default view duration of 7 days

    defaultStartDateTime: initStartDateTime,
    defaultEndDateTime: initEndDateTime,

    selectedStartDateTime: initStartDateTime,
    selectedEndDateTime: initEndDateTime,


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
      end: parseDate(DateTime.formatIsoDate(s.selectedEndDateTime)),
    });
  }, [
    s.selectedStartDateTime,
    s.selectedEndDateTime,
    rangeCalendarState]);

  /**
   * Update view duration based on the width of the slider.
   */
  const sliderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const newDuration = widthToDuration(width);

        d(SetViewDuration({
          viewDuration: Duration.days(newDuration.days),
        }));
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
      </Button>
      <RangeCalendar
        ref={rangeCalendarRef}
        defaultValue={{
          start: parseDate(DateTime.formatIsoDate(s.selectedStartDateTime)),
          end: parseDate(DateTime.formatIsoDate(s.selectedEndDateTime)),
        }}
        aria-label="Range dates"
        visibleDuration={{ days: Duration.toDays(s.viewDuration) }}>
        {/* <HorizontalCalendarGrid offset={{ months: 0 }} /> */}
        <HorizontalCalendar
          viewStartDateTime={s.viewStartDateTime}
          duration={s.viewDuration} />
      </RangeCalendar>
      <Button primary={true} className="next-prev-date-range" {...nextButtonProps}>
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
      </Button>
    </div>
  );
}
