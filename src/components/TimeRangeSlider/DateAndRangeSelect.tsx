import "./dateAndRangeSelect.css";
import { DateTime, Duration, pipe } from "effect";
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Heading, Label, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt, FaUndo, FaGlobe, FaClock } from "react-icons/fa";
import { TimeDuration } from "./timeSliderTypes";
import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Button, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";


interface LocalDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  returnToDefaultDateTime?: () => void;
  timeZone: 'local' | 'utc';
  onTimeZoneChange: (timeZone: 'local' | 'utc') => void;
  rangeValue?: TimeDuration;
  setRange?: (timeDuration: TimeDuration) => void;
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
    timeZone, onTimeZoneChange, rangeValue, setRange, ...props }:
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
      aria-label={label || "Select start date and time"}
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
        <Dialog aria-label="Date picker">
          <Calendar firstDayOfWeek={firstDayOfWeek} aria-label="Select date">
            <header>
              <CalendarButton slot="previous" aria-label="Previous month">
                <MdOutlineKeyboardArrowLeft />
              </CalendarButton>
              <Heading />
              <CalendarButton slot="next" aria-label="Next month">
                <MdOutlineKeyboardArrowRight />
              </CalendarButton>
            </header>
            <CalendarGrid aria-label="Calendar">
              {(date) => <CalendarCell date={date} />}
            </CalendarGrid>
          </Calendar>
          
          {/* Settings section in calendar popup */}
          <div className="calendar-settings-section">
            {/* Timezone Setting */}
            <div className="calendar-setting-item">
              <span className="calendar-setting-label">Timezone:</span>
              <ToggleButtonGroup
                value={timeZone}
                exclusive
                onChange={(_, newTimeZone) => newTimeZone && onTimeZoneChange(newTimeZone)}
                size="small"
                className="calendar-timezone-toggle"
              >
                <ToggleButton value="local" aria-label="Show times in local timezone">
                  Local
                </ToggleButton>
                <ToggleButton value="utc" aria-label="Show times in UTC timezone">
                  UTC
                </ToggleButton>
              </ToggleButtonGroup>
            </div>

            {/* Step Duration Setting */}
            {setRange && (
              <div className="calendar-setting-item">
                <span className="calendar-setting-label">Step Duration:</span>
                <ToggleButtonGroup
                  value={rangeValue}
                  exclusive
                  onChange={(_, newRange) => newRange && setRange(newRange)}
                  size="small"
                  className="calendar-duration-toggle"
                >
                  <ToggleButton value={TimeDuration['1m']} aria-label="1 minute">
                    1m
                  </ToggleButton>
                  <ToggleButton value={TimeDuration['5m']} aria-label="5 minutes">
                    5m
                  </ToggleButton>
                  <ToggleButton value={TimeDuration['10m']} aria-label="10 minutes">
                    10m
                  </ToggleButton>
                  <ToggleButton value={TimeDuration['30m']} aria-label="30 minutes">
                    30m
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>
            )}
          </div>

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
  rangeValue,
  setRange,
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  returnToDefaultDateTime?: () => void,
  timeZone: 'local' | 'utc',
  onTimeZoneChange: (timeZone: 'local' | 'utc') => void,
  rangeValue?: TimeDuration,
  setRange?: (timeDuration: TimeDuration) => void,
}) => {

  // Get timezone abbreviation
  const getTimezoneLabel = () => {
    if (timeZone === 'utc') return 'UTC';
    
    // Get local timezone abbreviation
    const now = new Date();
    const timeZoneName = Intl.DateTimeFormat('en', { 
      timeZoneName: 'short' 
    }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value;
    
    return timeZoneName || 'Local';
  };

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
      <SliderDatePicker
        label={`Start Date (${getTimezoneLabel()})`}
        value={calendarDateTime}
        onChange={handleDateChange}
        firstDayOfWeek={"sun"}
        returnToDefaultDateTime={returnToDefaultDateTime}
        timeZone={timeZone}
        onTimeZoneChange={onTimeZoneChange}
        rangeValue={rangeValue}
        setRange={setRange}
      />
    </div>);
}
