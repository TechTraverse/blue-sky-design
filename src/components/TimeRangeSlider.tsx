import './timeRangeSlider.css';
import { useReducer } from 'react';
import { DateTime, Option as O, Data as D } from 'effect';
import { Button } from './Button';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

export interface TimeRangeSliderProps {
  providedDate?: Date;
  onDateSelect?: () => void;
  onDateRangeSelect?: () => void;
}

type State = {
  selectedDateOrEndDate: DateTime.Utc;
  maybeSelectedStartDate: O.Option<DateTime.Utc>;
};

type Action = D.TaggedEnum<{
  SelectDate: { date: DateTime.Utc };
  SelectDateRange: { start: DateTime.Utc; end: DateTime.Utc };
  Reset: object;
}>;

const {
  SelectDate,
  SelectDateRange,
  Reset,
  $match,
} = D.taggedEnum<Action>();

const reducer = (state: State, action: Action): State =>
  $match({
    SelectDate: ({ date }) => ({
      ...state,
      selectedDateOrEndDate: date,
    }),
    SelectDateRange: ({ start, end }) => ({
      ...state,
      selectedDateOrEndDate: end,
      maybeSelectedStartDate: O.some(start),
    }),
    Reset: () => ({
      selectedDateOrEndDate: DateTime.unsafeMake(new Date()),
      maybeSelectedStartDate: O.none(),
    }),
  })(action);

export const TimeRangeSlider = ({
  providedDate,
  onDateSelect,
  onDateRangeSelect }: TimeRangeSliderProps) => {

  const selectedDateTime = O.fromNullable(providedDate).pipe(
    O.flatMap(DateTime.make),
    O.getOrElse(() => {
      console.warn("No date or invalide date provided, using current date instead.");
      return DateTime.unsafeMake(new Date());
    }));

  const [s, d] = useReducer(reducer, {
    selectedDateOrEndDate: selectedDateTime,
    maybeSelectedStartDate: O.none(),
  });

  return (
    <div className="time-range-slider">
      <Button primary={true} className="next-prev-date-range">
        <IoIosArrowBack
          onClick={() => console.log("Last date range")}
          title="Select Date"
        />
      </Button>
      <Button primary={true} className="next-prev-date-range">
        <IoIosArrowForward
          onClick={() => console.log("Next date range")}
          title="Select Date"
        />
      </Button>
    </div>
  );
}
