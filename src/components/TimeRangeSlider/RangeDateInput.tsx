import { DateTime, Effect, pipe, Schedule } from "effect";
import "./rangeDateInput.css";
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Group, Heading, Label, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt } from "react-icons/fa";

import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Box, Button, Divider, FormControl, InputLabel, MenuItem, Select, Tab, Tabs, Typography } from "@mui/material";
import { PlayMode, TimeDuration } from "./timeSliderTypes";
import { useState } from "react";
import { FiFastForward, FiRewind } from "react-icons/fi";
import { SpeedIndicator } from "./SpeedIndicator";

interface MyDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

const a11yProps = (index: number) => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

// Define an effect that logs a message to the console
const action = Effect.sync(() => console.log("success"));

// Define a schedule that repeats the action 2 more times with a delay
const policy = Schedule.addDelay(Schedule.recurs(9), () => "1000 millis")

// Repeat the action according to the schedule
const program = Effect.repeat(action, policy)


const AnimateNavControls = ({
  playMode,
  setPlayMode
}: {
  playMode: PlayMode,
  setPlayMode?: (mode: PlayMode) => void
}) => {
  return (
    <div className="animate-container">
      <div className="playback-nav-controls">
        <Button variant="contained" slot="previous">
          <FiRewind />
        </Button>
        {
          playMode === PlayMode.Play
            ? <Button variant="contained" onClick={() => {
              setPlayMode?.(PlayMode.Pause)
            }}>
              <TbPlayerPause />
            </Button>
            : <Button variant="contained" onClick={() => {
              setPlayMode?.(PlayMode.Play)
              // Run the program and log the number of repetitions
              Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
            }}>
              <TbPlayerPlay />
            </Button>
        }
        <Button variant="contained" slot="next">
          <FiFastForward />
        </Button>
      </div>
      <SpeedIndicator disabled={playMode === PlayMode.Pause} />
    </div>
  );
}

const StepNavControls = ({ fwd, rev }: {
  fwd?: () => void,
  rev?: () => void
}) => {
  return (
    <div className="playback-nav-controls">
      <Button variant="contained" slot="previous" onClick={() => rev?.()}>
        <TbPlayerSkipBack />
      </Button>
      <Button variant="contained" slot="next" onClick={() => fwd?.()}>
        <TbPlayerSkipForward />
      </Button>
    </div>
  );
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
    MyDatePickerProps<T>
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
    </DatePicker>);
}

export const RangeDateInput = ({
  startDateTime,
  setStartDateTime,
  animationEnabled = false,
  setAnimationEnabled = () => { },
  playMode,
  setPlayMode,
  incrememntStartDateTime,
  decrememntStartDateTime,
  rangeValue,
  setRange
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  animationEnabled?: boolean,
  setAnimationEnabled?: (enabled: boolean) => void,
  playMode?: PlayMode,
  setPlayMode?: (mode: PlayMode) => void,
  incrememntStartDateTime?: () => void,
  decrememntStartDateTime?: () => void,
  rangeValue?: TimeDuration,
  setRange?: (timeDuration: TimeDuration) => void
}) => {

  const [value, setValue] = useState(animationEnabled ? 1 : 0);

  const calendarDateTime = startDateTime ? pipe(
    DateTime.toParts(startDateTime),
    ({ year, month, day, hours, minutes, seconds, millis }) =>
      new CalendarDateTime(year, month, day, hours, minutes, seconds, millis)
  ) : undefined;
  return (
    <>
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
          <InputLabel shrink htmlFor="select-multiple-native">
            Range
          </InputLabel>
          <Select
            labelId="query-range-select-label"
            id="query-range-select"
            value={rangeValue}
            label="Range"
            inputProps={{
              id: 'select-multiple-native',
            }}
            variant="standard"
            onChange={(e) => setRange?.(e.target.value as TimeDuration)}
          >
            {
              Object.entries(TimeDuration).map(([key, value]) => {
                return isNaN(key as unknown as number) ? (
                  <MenuItem key={key} value={value}>
                    {key}
                  </MenuItem>
                ) : null;
              }).filter(Boolean)
            }
          </Select>
        </FormControl>
      </div>
      <Divider variant="middle" orientation={"vertical"} flexItem />
      <div className={`playback-section ${value ? "animate" : "step"}`}>
        <Tabs
          orientation="vertical"
          value={value}
          className="playback-tabs"
          onChange={(__, x) => {
            setValue(x);
            setAnimationEnabled(Boolean(x));
          }}
          aria-label="basic tabs example">
          <Tab label="Step" {...a11yProps(0)} />
          <Tab label="Animate" {...a11yProps(1)} />
        </Tabs>
        {animationEnabled && playMode
          ? <AnimateNavControls
            playMode={playMode}
            setPlayMode={setPlayMode} />
          : <StepNavControls
            fwd={incrememntStartDateTime}
            rev={decrememntStartDateTime} />}
      </div>
    </>);
}
