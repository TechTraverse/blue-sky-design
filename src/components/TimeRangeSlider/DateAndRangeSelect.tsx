import "./dateAndRangeSelect.css";
import { DateTime } from "effect";
import Popover from '@mui/material/Popover';
import PopupState, { bindTrigger, bindPopover } from 'material-ui-popup-state';
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, Heading, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt } from "react-icons/fa";
import { TimeDuration } from "./timeSliderTypes";
import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';

// RangeValue was removed from react-aria-components, define locally
type RangeValue<T> = { start: T; end: T };
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTimeZoneDisplay } from '../../contexts/TimeZoneDisplayContext';
import { TimeZoneToggle } from './TimeZoneToggle';
import { floorToGrid } from './stepping';
import { formatAgo, formatClockTime, formatReadoutDate, zoneAbbreviation } from './timeLabels';


interface LocalDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  returnToDefaultDateTime?: () => void;
  rangeValue?: TimeDuration;
  setRange?: (timeDuration: TimeDuration) => void;
  availableDateRange?: Partial<RangeValue<Date>>;
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

/** A UTC instant as the calendar's wall-clock value in the display zone. */
const toCalendarDateTime = (
  dt: DateTime.DateTime,
  toDisplay: (dt: DateTime.DateTime) => DateTime.DateTime,
) => {
  const parts = DateTime.toParts(toDisplay(dt));
  return new CalendarDateTime(
    parts.year,
    parts.month,
    parts.day,
    parts.hours,
    parts.minutes,
    parts.seconds,
    (parts as { millis?: number }).millis ?? 0
  );
};

/** The picker's min and max from the selectable range. Either end may be open. */
const useCalendarBounds = (
  availableDateRange: Partial<RangeValue<Date>> | undefined,
  toDisplay: (dt: DateTime.DateTime) => DateTime.DateTime,
) => ({
  min: availableDateRange?.start
    ? toCalendarDateTime(DateTime.unsafeFromDate(availableDateRange.start), toDisplay) : undefined,
  max: availableDateRange?.end
    ? toCalendarDateTime(DateTime.unsafeFromDate(availableDateRange.end), toDisplay) : undefined,
});

const CalendarPopoverBody = ({ firstDayOfWeek, children }: {
  firstDayOfWeek?: DatePickerProps<DateValue>['firstDayOfWeek'],
  children?: React.ReactNode,
}) => (
  <Dialog aria-label="Date picker">
    <div className="slider-date-picker">
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
      <div className="calendar-settings-section">
        <div className="calendar-setting-item">
          <span className="calendar-setting-label">Timezone:</span>
          <TimeZoneToggle />
        </div>
        {children}
      </div>
    </div>
  </Dialog>
);

/**
 * Instant mode's readout: the selected time large, with the zone's short name,
 * the date under it, and whether this is the newest selectable time or how long
 * ago it was. The whole readout opens the calendar, where the time can also be
 * typed.
 */
const InstantDatePicker = ({ value, onChange, instant, availableDateRange, latestMs }: {
  value: CalendarDateTime | undefined,
  onChange: (d: DateValue | null) => void,
  instant: DateTime.DateTime | undefined,
  availableDateRange?: Partial<RangeValue<Date>>,
  /** The newest selectable grid point; the readout says "Latest" there. */
  latestMs?: number,
}) => {
  const { toDisplay, getDisplayZone } = useTimeZoneDisplay();
  const { min, max } = useCalendarBounds(availableDateRange, toDisplay);
  const zone = getDisplayZone();
  const date = instant ? DateTime.toDate(instant) : undefined;
  const time = date ? formatClockTime(date, zone) : '--:--';
  const abbreviation = date ? zoneAbbreviation(date, zone) : '';
  const day = date ? formatReadoutDate(date, zone) : '';
  const isLatest = date !== undefined && latestMs !== undefined && date.getTime() >= latestMs;
  // Read at render; the consumer re-renders as the clock-based ceiling moves.
  const ago = date && latestMs !== undefined && !isLatest
    ? formatAgo(Date.now() - date.getTime()) : undefined;

  return (
    <DatePicker
      value={value}
      onChange={onChange}
      className="slider-date-picker-container instant-readout-container"
      granularity="minute"
      hourCycle={24}
      hideTimeZone
      shouldForceLeadingZeros
      aria-label={`Date and time (${abbreviation})`}
      minValue={min}
      maxValue={max}
    >
      <PopupState variant="popover" popupId="instant-readout-popover">
        {(popupState) => (
          <>
            <CalendarButton
              className="instant-readout"
              aria-label={`Change date and time, selected ${time} ${abbreviation}, ${day}`}
              {...bindTrigger(popupState)}
            >
              <span className="instant-readout-time">
                {time}<span className="instant-readout-zone">{abbreviation}</span>
              </span>
              <span className="instant-readout-date">
                {day}
                {isLatest && <span className="instant-readout-chip latest">Latest</span>}
                {ago && <span className="instant-readout-chip ago">{ago}</span>}
              </span>
              <FaCalendarAlt className="instant-readout-icon" aria-hidden="true" />
            </CalendarButton>
            <Popover
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              {...bindPopover(popupState)}
            >
              <CalendarPopoverBody firstDayOfWeek="sun">
                <div className="calendar-setting-item instant-readout-entry">
                  <span className="calendar-setting-label">Time ({abbreviation}):</span>
                  <DateInput className="slider-date-picker-input">
                    {(segment) => <DateSegment segment={segment} aria-label={segment.type} />}
                  </DateInput>
                </div>
              </CalendarPopoverBody>
            </Popover>
          </>
        )}
      </PopupState>
    </DatePicker>
  );
};

const SliderDatePicker = <T extends DateValue>(
  { label, description, firstDayOfWeek,
    rangeValue, setRange, availableDateRange, ...props }:
    LocalDatePickerProps<T>
) => {
  const { toDisplay } = useTimeZoneDisplay();

  const { min, max } = useCalendarBounds(availableDateRange, toDisplay);
  return (
    <DatePicker
      {...props}
      className={"slider-date-picker-container"}
      granularity="minute"
      hourCycle={24}
      hideTimeZone
      shouldForceLeadingZeros
      aria-label={label || "Select start date and time"}
      minValue={min}
      maxValue={max}
    >
      <FieldsetBox label={label} className={"slider-date-picker-group"}>
        <DateInput className={"slider-date-picker-input"}>
          {(segment) => <DateSegment segment={segment} aria-label={segment.type} />}
        </DateInput>
        <PopupState variant="popover" popupId="demo-popup-popover">
          {(popupState) => (
            <div>
              <CalendarButton aria-label="Open calendar" {...bindTrigger(popupState)}>
                <FaCalendarAlt />
              </CalendarButton>
              <Popover
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                {...bindPopover(popupState)}
              >
                <CalendarPopoverBody firstDayOfWeek={firstDayOfWeek}>
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
                </CalendarPopoverBody>
              </Popover>
            </div>
          )}
        </PopupState>
      </FieldsetBox>
      {description && <Text slot="description">{description}</Text>}
    </DatePicker>);
}

export const DateAndRangeSelect = ({
  startDateTime,
  setStartDateTime,
  rangeValue,
  setRange,
  availableDateRange,
  instantStepMs,
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  rangeValue?: TimeDuration,
  setRange?: (timeDuration: TimeDuration) => void,
  availableDateRange?: Partial<RangeValue<Date>>,
  returnToDefaultDateTime?: () => void,
  /** Instant mode's grid step: a picked time is floored onto the grid. */
  instantStepMs?: number,
}) => {
  const { toDisplay, fromDisplay, getDisplayZone } = useTimeZoneDisplay();

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
      (parts as { millis?: number }).millis ?? 0
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

    // In instant mode the floored instant is what gets selected, so it is the
    // one checked against the ceiling: a time typed past the last grid point
    // can still floor onto it.
    const picked = instantStepMs
      ? DateTime.unsafeMake(floorToGrid(DateTime.toEpochMillis(utcDt), instantStepMs))
      : utcDt;

    // Enforce whichever ends of the selectable range are closed
    if (availableDateRange?.start &&
      DateTime.lessThan(utcDt, DateTime.unsafeFromDate(availableDateRange.start))) {
      console.warn("Selected date is before minimum allowed date");
      return;
    }
    if (availableDateRange?.end &&
      DateTime.greaterThan(picked, DateTime.unsafeFromDate(availableDateRange.end))) {
      console.warn("Selected date exceeds maximum allowed date");
      return;
    }

    setStartDateTime(picked);
  };

  const calendarDateTime = getDisplayDateTime(startDateTime);

  if (instantStepMs) {
    return (
      <div className="date-and-query-range-container">
        <InstantDatePicker
          value={calendarDateTime}
          onChange={handleDateChange}
          instant={startDateTime}
          availableDateRange={availableDateRange}
          latestMs={availableDateRange?.end
            ? floorToGrid(availableDateRange.end.getTime(), instantStepMs) : undefined}
        />
      </div>);
  }

  return (
    <div className="date-and-query-range-container">
      <SliderDatePicker
        label={`Start Date (${getDisplayZone()})`}
        value={calendarDateTime}
        onChange={handleDateChange}
        firstDayOfWeek={"sun"}
        rangeValue={rangeValue}
        setRange={setRange}
        availableDateRange={availableDateRange}
      />
    </div>);
}
