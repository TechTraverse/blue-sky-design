import { DateTime, pipe } from "effect";
import "./rangeDateInput.css";
import { Button, Calendar, CalendarCell, CalendarGrid, DateField, DateInput, DatePicker, DateSegment, Dialog, FieldError, Group, Heading, Label, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaArrowDown } from "react-icons/fa";

import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { IoIosArrowDropright, IoIosArrowUp } from "react-icons/io";
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";

interface MyDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

function SliderDatePicker<T extends DateValue>(
  { label, description, errorMessage, firstDayOfWeek, ...props }:
    MyDatePickerProps<T>
) {
  return (
    <DatePicker {...props}>
      <Label>{label}</Label>
      <Group>
        <DateInput>
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <Button>
          <IoIosArrowUp />
        </Button>
      </Group>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="slider-date-picker">
        <Dialog>
          <Calendar firstDayOfWeek={firstDayOfWeek}>
            <header>
              <Button slot="previous">
                <MdOutlineKeyboardArrowLeft />

              </Button>
              <Heading />
              <Button slot="next">
                <MdOutlineKeyboardArrowRight />
              </Button>
            </header>
            <CalendarGrid>
              {(date) => <CalendarCell date={date} />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}

const RangeDate = ({ label, dateTime, setDateTime }: {
  label?: string,
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
      {label ? <Label className="range-date-label">{label}</Label> : null}
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
}) => {
  const calendarDateTime = startDateTime ? pipe(
    DateTime.toParts(startDateTime),
    ({ year, month, day }) => new CalendarDateTime(year, month, day, 0, 0, 0, 0) // Set time to midnight
  ) : undefined;
  return (
    <div className="range-date-input">
      <SliderDatePicker
        value={calendarDateTime}
        onChange={d => setStartDateTime && pipe(
          d?.toString(),
          x => x && new Date(x),
          x => x && DateTime.unsafeFromDate(x),
          x => x && setStartDateTime?.(x))}
        firstDayOfWeek={"sun"}
      />
    </div>);
}
