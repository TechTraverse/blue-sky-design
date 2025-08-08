import { DateTime, pipe } from "effect";
import "./rangeDateInput.css";
import { Button, Calendar, CalendarCell, CalendarGrid, DateField, DateInput, DatePicker, DateSegment, Dialog, FieldError, Group, Heading, Label, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt } from "react-icons/fa";

import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import NativeSelect from '@mui/material/NativeSelect';
import { TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Switch } from "@mui/material";

interface MyDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  animationEnabled?: boolean;
  setAnimationEnabled?: (enabled: boolean) => void;
}

function SliderDatePicker<T extends DateValue>(
  { label, description, errorMessage, firstDayOfWeek,
    animationEnabled = false,
    setAnimationEnabled = () => { },
    ...props }:
    MyDatePickerProps<T>
) {
  return (<>
    <Group className={'date-calendar-and-switch-group'}>
      <DatePicker {...props} className={"slider-date-picker-container"}>
        <Label>{label}</Label>
        <Group className={'slider-date-picker-group'}>
          <DateInput className={"slider-date-picker-input"}>
            {(segment) => <DateSegment segment={segment} />}
          </DateInput>
          <Button>
            <FaCalendarAlt />
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
      <Switch
        value={animationEnabled}
        onChange={(e) => setAnimationEnabled(e.target.checked)}
      />
    </Group>
    <Group className={'range-selection-group'}>
      <FormControl fullWidth>
        <InputLabel variant="standard" htmlFor="uncontrolled-native">
          Interval:
        </InputLabel>
        <NativeSelect
          defaultValue={300}
          inputProps={{
            name: 'range',
            id: 'uncontrolled-native',
          }}
        >
          <option value={60}>1m</option>
          <option value={300}>5m</option>
          <option value={600}>10m</option>
          <option value={3600}>1h</option>
          <option value={10800}>3h</option>
          <option value={43200}>12h</option>
          <option value={86400}>24h</option>
        </NativeSelect>
      </FormControl>
      <Button slot="previous">
        <TbPlayerSkipBack />
      </Button>
      <Heading />
      <Button slot="next">
        <TbPlayerSkipForward />
      </Button>
    </Group>
  </>);
}

export const RangeDateInput = ({
  startDateTime,
  setStartDateTime,
  animationEnabled = false,
  setAnimationEnabled = () => { },
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  animationEnabled?: boolean,
  setAnimationEnabled?: (enabled: boolean) => void,
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
        animationEnabled={animationEnabled}
        setAnimationEnabled={setAnimationEnabled}
      />
    </div>);
}
