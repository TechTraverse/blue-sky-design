import "./dateAndRangeSelect.css";
import { DateTime } from "effect";
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Heading, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt, FaUndo } from "react-icons/fa";
import { TimeDuration } from "./timeSliderTypes";
import type { DatePickerProps, DateValue, ValidationResult, RangeValue } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Button, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTimeZoneDisplay } from '../../contexts/TimeZoneDisplayContext';
import { TimeZoneToggle } from './TimeZoneToggle';


interface LocalDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  returnToDefaultDateTime?: () => void;
  rangeValue?: TimeDuration;
  setRange?: (timeDuration: TimeDuration) => void;
  dateRangeForReset?: RangeValue<Date>;
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
    rangeValue, setRange, dateRangeForReset, ...props }:
    LocalDatePickerProps<T>
) => {
  const { toDisplay, mode } = useTimeZoneDisplay();

  // Calculate max allowed date from dateRangeForReset
  const getMaxValue = () => {
    if (!dateRangeForReset) return undefined;

    // dateRangeForReset.start is actually the max allowed datetime
    // Convert to display timezone first
    const maxDateTime = DateTime.unsafeFromDate(dateRangeForReset.start);
    const displayMaxDateTime = toDisplay(maxDateTime);
    const parts = DateTime.toParts(displayMaxDateTime);

    const calendarDate = new CalendarDateTime(
      parts.year,
      parts.month,
      parts.day,
      parts.hours,
      parts.minutes,
      parts.seconds,
      parts.milliseconds
    );
    return calendarDate;
  };
  return (
    <DatePicker
      {...props}
      className={"slider-date-picker-container"}
      granularity="minute"
      hourCycle={24}
      hideTimeZone
      shouldForceLeadingZeros
      aria-label={label || "Select start date and time"}
      maxValue={getMaxValue()}
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
              <TimeZoneToggle />
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
        </Dialog>
      </Popover>
    </DatePicker>);
}

export const DateAndRangeSelect = ({
  startDateTime,
  setStartDateTime,
  rangeValue,
  setRange,
  dateRangeForReset,
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  rangeValue?: TimeDuration,
  setRange?: (timeDuration: TimeDuration) => void,
  dateRangeForReset?: RangeValue<Date>,
}) => {
  const { toDisplay, fromDisplay, mode, getDisplayZone } = useTimeZoneDisplay();

  // Convert DateTime to CalendarDateTime for display
  const getDisplayDateTime = (dt: DateTime.DateTime | undefined) => {
    if (!dt) return undefined;

    const displayDt = toDisplay(dt);
    const parts = DateTime.toParts(displayDt);

    return new CalendarDateTime(
      parts.year,
      parts.month,
      parts.day,
      parts.hours,
      parts.minutes,
      parts.seconds,
      parts.milliseconds
    );
  };

  // Convert CalendarDateTime back to UTC DateTime
  const handleDateChange = (d: DateValue | null) => {
    if (!d || !setStartDateTime) return;

    const {
      year,
      month,
      day,
      hour = 0,
      minute = 0,
      second = 0,
      millisecond = 0 } = d as CalendarDateTime;

    // Create DateTime in display timezone, then convert to UTC using fromDisplay
    // This matches the pattern used in HorizontalCalendar
    const displayDateTime = DateTime.unsafeFromDate(
      new Date(year, month - 1, day, hour, minute, second, millisecond)
    );

    // Convert from display timezone back to UTC
    const utcDt = fromDisplay(displayDateTime);

    // Enforce maximum date limit if dateRangeForReset is provided
    if (dateRangeForReset) {
      const maxDateTime = DateTime.unsafeFromDate(dateRangeForReset.start);
      if (DateTime.greaterThan(utcDt, maxDateTime)) {
        // Don't update if the selected date exceeds the maximum
        console.warn("Selected date exceeds maximum allowed date");
        return;
      }
    }

    setStartDateTime(utcDt);
  };

  const calendarDateTime = getDisplayDateTime(startDateTime);

  return (
    <div className="date-and-query-range-container">
      <SliderDatePicker
        label={`Start Date (${getDisplayZone()})`}
        value={calendarDateTime}
        onChange={handleDateChange}
        firstDayOfWeek={"sun"}
        rangeValue={rangeValue}
        setRange={setRange}
        dateRangeForReset={dateRangeForReset}
      />
    </div>);
}
