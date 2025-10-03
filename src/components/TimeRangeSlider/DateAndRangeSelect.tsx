import "./dateAndRangeSelect.css";
import { DateTime, pipe } from "effect";
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Heading, Label, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt, FaUndo } from "react-icons/fa";
import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Button, Box } from "@mui/material";


interface LocalDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  returnToDefaultDateTime?: () => void;
}

function FieldsetBox({
  children, label, className }: {
    children: React.ReactNode | React.ReactNode[],
    label: string | undefined;
    className?: string;
  }): React.JSX.Element | null {
  return (
    <Box component="fieldset" className={className}>
      <legend>{label}</legend>
      {children}
    </Box>
  );
}

const SliderDatePicker = <T extends DateValue>(
  { label, description, errorMessage, firstDayOfWeek, returnToDefaultDateTime,
    ...props }:
    LocalDatePickerProps<T>
) => {
  return (
    <DatePicker {...props} className={"slider-date-picker-container"}>
      {label && <Label>{label}</Label>}
      <FieldsetBox label={label} className={"slider-date-picker-group"}>
        <DateInput className={"slider-date-picker-input"}>
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <CalendarButton>
          <FaCalendarAlt />
        </CalendarButton>
      </FieldsetBox>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="slider-date-picker">
        <Dialog>
          <Calendar firstDayOfWeek={firstDayOfWeek}>
            <header>
              <CalendarButton slot="previous">
                <MdOutlineKeyboardArrowLeft />
              </CalendarButton>
              <Heading />
              <CalendarButton slot="next">
                <MdOutlineKeyboardArrowRight />
              </CalendarButton>
            </header>
            <CalendarGrid>
              {(date) => <CalendarCell date={date} />}
            </CalendarGrid>
          </Calendar>
          <Button onClick={returnToDefaultDateTime}>
            <div className="default-date">
              <FaUndo />
              <span>Default</span>
            </div>
          </Button>
        </Dialog>
      </Popover>
    </DatePicker>);
}

export const DateAndRangeSelect = ({
  startDateTime,
  setStartDateTime,
  returnToDefaultDateTime,
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  returnToDefaultDateTime?: () => void,
}) => {

  const calendarDateTime = startDateTime ? pipe(
    DateTime.toParts(startDateTime),
    ({ year, month, day, hours, minutes, seconds, millis }) =>
      new CalendarDateTime(year, month, day, hours, minutes, seconds, millis)
  ) : undefined;

  return (
    <div className="date-and-query-range-container">
      <SliderDatePicker
        label="Start Date"
        value={calendarDateTime}
        onChange={d => d && setStartDateTime?.(DateTime.unsafeMake({
          year: d.year,
          month: d.month,
          day: d.day,
          hours: d.hour,
          minutes: d.minute,
          seconds: d.second,
          millis: d.millisecond
        }))}
        firstDayOfWeek={"sun"}
        returnToDefaultDateTime={returnToDefaultDateTime}
      />
    </div>);
}
