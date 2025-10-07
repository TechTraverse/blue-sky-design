import "./dateAndRangeSelect.css";
import { DateTime, pipe } from "effect";
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Heading, Label, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt, FaUndo, FaGlobe, FaClock } from "react-icons/fa";
import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Button, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";


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
    <DatePicker 
      {...props} 
      className={"slider-date-picker-container"}
      granularity="minute"
      hourCycle={24}
      hideTimeZone
      shouldForceLeadingZeros
    >
      <FieldsetBox label={label} className={"slider-date-picker-group"}>
        <DateInput className={"slider-date-picker-input"}>
          {(segment) => <DateSegment segment={segment} aria-label={segment.type} />}
        </DateInput>
        <CalendarButton aria-label="Open calendar">
          <FaCalendarAlt />
        </CalendarButton>
      </FieldsetBox>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="slider-date-picker">
        <Dialog>
          <Calendar firstDayOfWeek={firstDayOfWeek}>
            <header>
              <CalendarButton slot="previous" aria-label="Previous month">
                <MdOutlineKeyboardArrowLeft />
              </CalendarButton>
              <Heading />
              <CalendarButton slot="next" aria-label="Next month">
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
  timeZone,
  onTimeZoneChange,
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  returnToDefaultDateTime?: () => void,
  timeZone: 'local' | 'utc',
  onTimeZoneChange: (timeZone: 'local' | 'utc') => void,
}) => {

  // Convert DateTime to display timezone for the picker
  const getDisplayDateTime = (dt: DateTime.DateTime | undefined) => {
    if (!dt) return undefined;
    
    // Get the timestamp in milliseconds
    const timestamp = DateTime.toEpochMillis(dt);
    const jsDate = new Date(timestamp);
    
    if (timeZone === 'utc') {
      // Show UTC time for the same moment
      const utcParts = {
        year: jsDate.getUTCFullYear(),
        month: jsDate.getUTCMonth() + 1,
        day: jsDate.getUTCDate(),
        hours: jsDate.getUTCHours(),
        minutes: jsDate.getUTCMinutes(),
        seconds: jsDate.getUTCSeconds(),
        millis: jsDate.getUTCMilliseconds()
      };
      return new CalendarDateTime(utcParts.year, utcParts.month, utcParts.day, utcParts.hours, utcParts.minutes, utcParts.seconds, utcParts.millis);
    } else {
      // Show local time for the same moment
      const localParts = {
        year: jsDate.getFullYear(),
        month: jsDate.getMonth() + 1,
        day: jsDate.getDate(),
        hours: jsDate.getHours(),
        minutes: jsDate.getMinutes(),
        seconds: jsDate.getSeconds(),
        millis: jsDate.getMilliseconds()
      };
      return new CalendarDateTime(localParts.year, localParts.month, localParts.day, localParts.hours, localParts.minutes, localParts.seconds, localParts.millis);
    }
  };

  // Convert picker value back to DateTime in correct timezone
  const handleDateChange = (d: DateValue | null) => {
    if (!d || !setStartDateTime) return;
    
    if (timeZone === 'utc') {
      // User entered UTC time - create a Date in UTC and convert to DateTime
      const utcDate = new Date(Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.second, d.millisecond));
      setStartDateTime(DateTime.unsafeFromDate(utcDate));
    } else {
      // User entered local time - create a Date in local timezone and convert to DateTime
      const localDate = new Date(d.year, d.month - 1, d.day, d.hour, d.minute, d.second, d.millisecond);
      setStartDateTime(DateTime.unsafeFromDate(localDate));
    }
  };

  const calendarDateTime = getDisplayDateTime(startDateTime);

  return (
    <div className="date-and-query-range-container">
      <div className="timezone-toggle">
        <ToggleButtonGroup
          value={timeZone}
          exclusive
          onChange={(_, newTimeZone) => newTimeZone && onTimeZoneChange(newTimeZone)}
          size="small"
          className="timezone-button-group"
        >
          <ToggleButton value="local" className="timezone-button" aria-label="Show times in local timezone">
            <FaClock size={12} />
            <span>Local</span>
          </ToggleButton>
          <ToggleButton value="utc" className="timezone-button" aria-label="Show times in UTC timezone">
            <FaGlobe size={12} />
            <span>UTC</span>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <SliderDatePicker
        label={`Start Date (${timeZone.toUpperCase()})`}
        value={calendarDateTime}
        onChange={handleDateChange}
        firstDayOfWeek={"sun"}
        returnToDefaultDateTime={returnToDefaultDateTime}
      />
    </div>);
}
