import { DateTime, pipe } from "effect";
import "./rangeDateInput.css";
import { DateField, DateInput, DateSegment, FieldError, Label, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";

const RangeDate = ({ dateTime, setDateTime }: {
  dateTime?: DateTime.DateTime,
  setDateTime?: (date: DateTime.DateTime) => void
}) => {
  const calendarDateTime = dateTime ? pipe(
    DateTime.toParts(dateTime),
    ({ year, month, day }) => new CalendarDateTime(year, month, day, 0, 0, 0, 0) // Set time to midnight
  ) : undefined;
  console.log("RangeDate", calendarDateTime);

  return (
    <DateField
      className={'range-date'}
      value={calendarDateTime}
      // TODO: Cleaner conversion?
      onChange={d => pipe(
        d?.toString(),
        x => x && new Date(x),
        x => x && DateTime.unsafeFromDate(x),
        x => x && setDateTime?.(x))
      }>
      <Label />
      <DateInput>
        {(segment) => <DateSegment segment={segment} />}
      </DateInput>
      <Text slot="description" />
      <FieldError />
    </DateField>);
}

export const RangeDateInput = ({ startDateTime, endDateTime, setStartDateTime, setEndDateTime }: {
  startDateTime?: DateTime.DateTime,
  endDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  setEndDateTime?: (date: DateTime.DateTime) => void,
}) => (
  <div className="range-date-input">
    <RangeDate dateTime={startDateTime} setDateTime={setStartDateTime} />
    <span className="range-date-separator">-</span>
    <RangeDate dateTime={endDateTime} setDateTime={setEndDateTime} />
  </div>);
