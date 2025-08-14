import { DateTime, Effect, pipe, Schedule } from "effect";
import "./rangeDateInput.css";
import { Button, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Group, Heading, Label, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt } from "react-icons/fa";

import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import NativeSelect from '@mui/material/NativeSelect';
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { ButtonGroup, Divider, MenuItem, Select, styled, Switch, Tab, Tabs } from "@mui/material";
import { PlayMode } from "./timeSliderTypes";
import { useState } from "react";

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

const playbackSwitchSVG = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 512 512"><path fill="${encodeURIComponent(
  '#fff',
)}" d="M0 256a256 256 0 1 1 512 0 256 256 0 1 1 -512 0zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z"/></svg>')`;

// Define an effect that logs a message to the console
const action = Effect.sync(() => console.log("success"));

// Define a schedule that repeats the action 2 more times with a delay
const policy = Schedule.addDelay(Schedule.recurs(9), () => "1000 millis")

// Repeat the action according to the schedule
const program = Effect.repeat(action, policy)

const PlaybackNavControls = ({
  playMode,
  setPlayMode
}: {
  playMode?: PlayMode,
  setPlayMode?: (mode: PlayMode) => void
}) => {
  return (
    <div className="playback-nav-controls">
      <Button slot="previous">
        <TbPlayerSkipBack />
      </Button>
      {
        playMode === PlayMode.Play
          ? <Button slot="pause" onPress={() => {
            setPlayMode?.(PlayMode.Pause)
          }}>
            <TbPlayerPause />
          </Button>
          : playMode === PlayMode.Pause
            ? <Button slot="play" onPress={() => {
              setPlayMode?.(PlayMode.Play)
              // Run the program and log the number of repetitions
              Effect.runPromise(program).then((n) => console.log(`repetitions: ${n}`))
            }}>
              <TbPlayerPlay />
            </Button>
            : null
      }
      <Button slot="next">
        <TbPlayerSkipForward />
      </Button>
    </div>
  );
}

const PlaybackSwitch = styled(Switch)(({ theme }) => ({
  width: 53,
  height: 28,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        backgroundImage: playbackSwitchSVG,
      },
      '& + .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: '#aab4be',
        ...theme.applyStyles('dark', {
          backgroundColor: '#8796A5',
        }),
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: '#001e3c',
    width: 26,
    height: 26,
    '&::before': {
      content: "''",
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundImage: playbackSwitchSVG,
    },
    ...theme.applyStyles('dark', {
      backgroundColor: '#003892',
    }),
  },
  '& .MuiSwitch-track': {
    opacity: 1,
    backgroundColor: '#aab4be',
    borderRadius: 20 / 2,
    ...theme.applyStyles('dark', {
      backgroundColor: '#8796A5',
    }),
  },
}));

function SliderDatePicker<T extends DateValue>(
  { label, description, errorMessage, firstDayOfWeek,
    ...props }:
    MyDatePickerProps<T>
) {
  return (
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
    </DatePicker>);
}

export const RangeDateInput = ({
  startDateTime,
  setStartDateTime,
  animationEnabled = false,
  setAnimationEnabled = () => { },
  playMode,
  setPlayMode
}: {
  startDateTime?: DateTime.DateTime,
  setStartDateTime?: (date: DateTime.DateTime) => void,
  animationEnabled?: boolean,
  setAnimationEnabled?: (enabled: boolean) => void,
  playMode?: PlayMode,
  setPlayMode?: (mode: PlayMode) => void,
}) => {

  const [value, setValue] = useState(0);

  const handleChange = (__: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const calendarDateTime = startDateTime ? pipe(
    DateTime.toParts(startDateTime),
    ({ year, month, day }) => new CalendarDateTime(year, month, day, 0, 0, 0, 0) // Set time to midnight
  ) : undefined;
  return (
    <div className="slider-control-panel">
      <SliderDatePicker
        value={calendarDateTime}
        onChange={d => setStartDateTime && pipe(
          d?.toString(),
          x => x && new Date(x),
          x => x && DateTime.unsafeFromDate(x),
          x => x && setStartDateTime?.(x))}
        firstDayOfWeek={"sun"}
      />
      <Select
        labelId="query-range-select-label"
        id="query-range-select"
        className="query-range-select"
        value={300}
        label="Range"
        onChange={(e) => console.log(e.target.value)}
      >
        <MenuItem value={60}>1m</MenuItem>
        <MenuItem value={300}>5m</MenuItem>
        <MenuItem value={600}>10m</MenuItem>
        <MenuItem value={3600}>1h</MenuItem>
        <MenuItem value={10800}>3h</MenuItem>
        <MenuItem value={43200}>12h</MenuItem>
        <MenuItem value={86400}>24h</MenuItem>
      </Select>
      <Divider variant="middle" orientation={"vertical"} flexItem />
      <div className="playback-section">
        <Tabs
          value={value}
          className="playback-tabs"
          onChange={handleChange}
          aria-label="basic tabs example">
          <Tab label="Step" {...a11yProps(0)} />
          <Tab label="Animate" {...a11yProps(1)} />
        </Tabs>
        <PlaybackNavControls
          playMode={playMode}
          setPlayMode={setPlayMode}
        />
      </div>
      {/* <Switch
        value={animationEnabled}
        onChange={(e) => setAnimationEnabled(e.target.checked)}
      />
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
      </FormControl> */}
    </div>);
}
