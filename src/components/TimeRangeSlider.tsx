import './timeRangeSlider.css';
import { useReducer } from 'react';
import { DateTime, Option as O, Data as D } from 'effect';
import { Button } from './Button';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { RangeCalendar, CalendarGrid, CalendarCell, CalendarGridHeader, CalendarGridBody } from 'react-aria-components';
import { CalendarDate, getDayOfWeek as _getDayOfWeek, parseDate } from '@internationalized/date';

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


const HorizontalCalendarGrid = ({ offset }: {
  offset: { months: number };
}) => (
  <CalendarGrid offset={offset}>
    <CalendarGridBody className="horizontal-calendar-grid-body">
      {date => <td>
        <div className="horizontal-day-column">
          <div>
            {getDayOfWeek(date)}
          </div>
          <div>
            {date.day}
          </div>
        </div>
      </td>}
    </CalendarGridBody>
  </CalendarGrid>);

export const TimeRangeSlider = ({
  initialStartDate,
  initialEndDate,
  onDateRangeSelect,
}: TimeRangeSliderProps) => {

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
        visibleDuration={{ weeks: 1 }}>
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
