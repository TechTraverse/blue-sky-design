import './timeRangeSlider.css';
import { useEffect, useReducer, useState } from 'react';
import { DateTime, Option as O, Data as D } from 'effect';
import { Button } from './Button';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { RangeCalendar, CalendarGrid, CalendarCell, CalendarGridHeader, CalendarGridBody } from 'react-aria-components';
import { CalendarDate, getDayOfWeek as _getDayOfWeek, createCalendar, parseDate } from '@internationalized/date';
import { useCalendarGrid, useLocale } from 'react-aria';
import { useCalendarState, type CalendarState } from 'react-stately';



export interface TimeRangeSliderProps {
  initialStartDate?: Date;
  initialEndDate?: Date;
  onDateRangeSelect?: () => void;
}

type State = {
  initEndDateTime: DateTime.Utc;
  initStartDateTime: DateTime.Utc;
  endDateTime: DateTime.Utc;
  startDateTime: DateTime.Utc;
};

type Action = D.TaggedEnum<{
  SetInitialDates: {
    initStartDateTime: DateTime.Utc;
    initEndDateTime: DateTime.Utc;
  };
  SelectDateRange: { start: DateTime.Utc; end: DateTime.Utc };
  Reset: object;
}>;

const {
  SetInitialDates,
  SelectDateRange,
  Reset,
  $match,
} = D.taggedEnum<Action>();

const reducer = (state: State, action: Action): State =>
  $match({
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

const getDayOfWeek = (date: CalendarDate): string => {
  const weekDayIndex = _getDayOfWeek(date, 'en-US');
  switch (weekDayIndex) {
    case 0: return 'S';
    case 1: return 'M';
    case 2: return 'T';
    case 3: return 'W';
    case 4: return 'T';
    case 5: return 'F';
    case 6: return 'S';
    default: return '';
  }
};

const CustomCalendarGrid = ({ state }: { state: CalendarState }) => {
  const { gridProps, headerProps, weekDays, weeksInMonth } = useCalendarGrid(
    {},
    state
  );

  return (
    <table {...gridProps}>
      <thead {...headerProps}>
        <tr>
          {weekDays.map((day, index) => <th key={index}>{day}</th>)}
        </tr>
      </thead>
      <tbody>
        {[...new Array(weeksInMonth).keys()].map((weekIndex) => (
          <tr key={weekIndex}>
            {state.getDatesInWeek(weekIndex).map((date, i) => (
              date
                ? (
                  <CalendarCell
                    key={i}
                    state={state}
                    date={date}
                  />
                )
                : <td key={i} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const HorizontalCalendarGrid = ({ offset }: {
  offset: { months: number };
}) => {
  const [currentMonth, setCurrentMonth] = useState(0);

  return (
    <CalendarGrid offset={offset}>
      <CalendarGridBody className="horizontal-calendar-grid-body">
        {date => {
          const dayOfWeek = getDayOfWeek(date);
          const isFirstDayOfMonth = date.day === 1;

          if (!currentMonth && isFirstDayOfMonth) {
            setCurrentMonth(date.month);
          }

          if (currentMonth && isFirstDayOfMonth) {
            setCurrentMonth(0);
          }

          return currentMonth ? (<td>
            <div className="horizontal-day-column">
              {isFirstDayOfMonth ? <div>
                {date.month.toString()}/{date.year}
              </div> : <div />}
              <div>
                {dayOfWeek}
              </div>
              <div>
                {date.day}
              </div>
            </div>
          </td>) : <></>;
        }}
      </CalendarGridBody>
    </CalendarGrid>);
}

export const TimeRangeSlider = ({
  initialStartDate,
  initialEndDate,
  onDateRangeSelect,
}: TimeRangeSliderProps) => {

  const { locale } = useLocale();
  const state = useCalendarState({
    createCalendar,
    locale
  });


  const initialEndDateTime = O.fromNullable(initialEndDate).pipe(
    O.flatMap(DateTime.make),
    O.getOrElse(() => {
      console.warn(
        "No end date or invalide date provided, using current date instead.");
      return DateTime.unsafeMake(new Date());
    }));
  const initialStartDateTime = O.fromNullable(initialStartDate).pipe(
    O.flatMap(DateTime.make),
    O.getOrElse(() => {
      console.warn(
        "No start date for range or invalide date provided, using 1 hour date range.");
      return DateTime.subtract(initialEndDateTime, { hours: 1 });
    }));

  const [s, d] = useReducer(reducer, {
    initEndDateTime: initialEndDateTime,
    initStartDateTime: initialStartDateTime,
    endDateTime: initialEndDateTime,
    startDateTime: initialStartDateTime,
  });

  return (
    <div className="time-range-slider">
      <Button primary={true} className="next-prev-date-range">
        <IoIosArrowBack
          onClick={() => console.log("Last date range")}
          title="Select Date"
        />
      </Button>
      <RangeCalendar
        defaultValue={{
          start: parseDate(DateTime.formatIsoDate(s.startDateTime)),
          end: parseDate(DateTime.formatIsoDate(s.endDateTime)),
        }}
        aria-label="Trip dates"
        visibleDuration={{ months: 1 }}>
        {/* <header>
          <Button slot="previous">◀</Button>
          <Heading />
          <Button slot="next">▶</Button>
        </header> */}
        <HorizontalCalendarGrid offset={{ months: 0 }} />
      </RangeCalendar>
      <Button primary={true} className="next-prev-date-range">
        <IoIosArrowForward
          onClick={() => console.log("Next date range")}
          title="Select Date"
        />
      </Button>
    </div>
  );
}
