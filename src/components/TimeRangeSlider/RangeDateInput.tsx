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
import { styled, Switch } from "@mui/material";
import { PlayMode } from "./timeSliderTypes";

interface MyDatePickerProps<T extends DateValue> extends DatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

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
  width: 62,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          '#fff',
        )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
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
    width: 32,
    height: 32,
    '&::before': {
      content: "''",
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        '#fff',
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
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
      <PlaybackNavControls
        playMode={playMode}
        setPlayMode={setPlayMode}
      />
      <PlaybackSwitch
        checked={animationEnabled}
        onChange={(e) => setAnimationEnabled(e.target.checked)}
      />
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
