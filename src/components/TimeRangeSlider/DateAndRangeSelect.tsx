import "./dateAndRangeSelect.css";
import { DateTime, pipe } from "effect";
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Heading, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt } from "react-icons/fa";
import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Box, Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { TimeDuration } from "./timeSliderTypes";


interface LocalDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
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
  { label, description, errorMessage, firstDayOfWeek,
    ...props }:
    LocalDatePickerProps<T>
) => {
  return (
    <DatePicker {...props} className={"slider-date-picker-container"}>
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
    </DatePicker>);
}

export const DateAndRangeSelect = ({
  startDateTime,
  setStartDateTime,
  rangeValue,
  setRange
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  rangeValue?: TimeDuration,
  setRange?: (timeDuration: TimeDuration) => void
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
      />
      <FormControl sx={{ m: 1 }} className="query-range-select">
        <InputLabel shrink>
          Range/Step
        </InputLabel>
        <Select
          labelId="query-range-select-label"
          id="query-range-select"
          value={rangeValue}
          label="Range/Step"
          variant="standard"
          onChange={(e) => setRange?.(e.target.value as TimeDuration)}
        >{Object.entries(TimeDuration).map(([key, value]) => {
          return isNaN(key as unknown as number) ? (
            <MenuItem key={key} value={value}>
              {key}
            </MenuItem>
          ) : null;
        }).filter(Boolean)
          }</Select>
      </FormControl>
    </div>);
}
