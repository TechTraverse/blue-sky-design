import { DateTime, Effect, pipe, Schedule } from "effect";
import "./rangeDateInput.css";
import { Button as CalendarButton, Calendar, CalendarCell, CalendarGrid, DateInput, DatePicker, DateSegment, Dialog, FieldError, Heading, Popover, Text } from 'react-aria-components';
import { CalendarDateTime } from "@internationalized/date";
import { FaCalendarAlt } from "react-icons/fa";
import type { DatePickerProps, DateValue, ValidationResult } from 'react-aria-components';
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Box, Button, Divider, FormControl, InputLabel, MenuItem, Select, Tab, Tabs } from "@mui/material";
import { AnimationSpeed, PlayMode, TimeDuration } from "./timeSliderTypes";
import { useState } from "react";
import { FiFastForward, FiRewind } from "react-icons/fi";
import { SpeedIndicator } from "./SpeedIndicator";

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
  setPlayMode,
  animationSpeed,
  setAnimationSpeed
}: {
  playMode: PlayMode,
  setPlayMode?: (mode: PlayMode) => void
  animationSpeed: AnimationSpeed,
  setAnimationSpeed?: (speed: number) => void
}) => {
  return (
    <div className="animate-container">
      <div className="playback-nav-controls">
        <Button variant="contained" slot="previous">
          <FiRewind />
        </Button>
        {playMode === PlayMode.Play
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
          </Button>}
        <Button variant="contained" slot="next">
          <FiFastForward />
        </Button>
      </div>
      <SpeedIndicator
        disabled={playMode === PlayMode.Pause}
        animationSpeed={animationSpeed}
        setAnimationSpeed={setAnimationSpeed} />
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

export const AnimateAndStepControls = ({
  animationEnabled = false,
  setAnimationEnabled = () => { },
  playMode,
  setPlayMode,
  animationSpeed,
  setAnimationSpeed,
  incrememntStartDateTime,
  decrememntStartDateTime,
}: {
  animationEnabled?: boolean,
  setAnimationEnabled?: (enabled: boolean) => void,
  playMode?: PlayMode,
  setPlayMode?: (mode: PlayMode) => void,
  animationSpeed: AnimationSpeed,
  setAnimationSpeed?: (speed: number) => void,
  incrememntStartDateTime?: () => void,
  decrememntStartDateTime?: () => void,
}) => {

  const [value, setValue] = useState(animationEnabled ? 1 : 0);

  return (
    <>
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
        {animationEnabled && playMode !== undefined
          ? <AnimateNavControls
            playMode={playMode}
            setPlayMode={setPlayMode}
            animationSpeed={animationSpeed}
            setAnimationSpeed={setAnimationSpeed} />
          : <StepNavControls
            fwd={incrememntStartDateTime}
            rev={decrememntStartDateTime} />}
      </div>
    </>);
}
