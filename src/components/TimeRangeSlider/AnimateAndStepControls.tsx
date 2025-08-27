import "./rangeDateInput.css";
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Button, Tab, Tabs } from "@mui/material";
import { AnimationSpeed, PlayMode } from "./timeSliderTypes";
import { useState } from "react";
import { FiFastForward, FiRewind } from "react-icons/fi";
import { SpeedIndicator } from "./SpeedIndicator";

const a11yProps = (index: number) => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const AnimateNavControls = ({
  playMode,
  setPlayMode,
  animationSpeed,
  setAnimationSpeed,
  incrementAnimationSpeed,
  decrementAnimationSpeed
}: {
  playMode: PlayMode,
  setPlayMode?: (mode: PlayMode) => void
  animationSpeed: AnimationSpeed,
  setAnimationSpeed?: (speed: number) => void,
  incrementAnimationSpeed?: () => void,
  decrementAnimationSpeed?: () => void
}) => {
  return (
    <div className="animate-container">
      <div className="playback-nav-controls">
        <Button variant="contained" slot="previous" onClick={() => decrementAnimationSpeed?.()}>
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
          }}>
            <TbPlayerPlay />
          </Button>}
        <Button variant="contained" slot="next" onClick={() => incrementAnimationSpeed?.()}>
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
  incrementStartDateTime,
  decrementStartDateTime,
  incrementAnimationSpeed,
  decrementAnimationSpeed,
}: {
  animationEnabled?: boolean,
  setAnimationEnabled?: (enabled: boolean) => void,
  playMode?: PlayMode,
  setPlayMode?: (mode: PlayMode) => void,
  animationSpeed: AnimationSpeed,
  setAnimationSpeed?: (speed: number) => void,
  incrementStartDateTime?: () => void,
  decrementStartDateTime?: () => void,
  incrementAnimationSpeed?: () => void,
  decrementAnimationSpeed?: () => void,
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
            setAnimationSpeed={setAnimationSpeed}
            incrementAnimationSpeed={incrementAnimationSpeed}
            decrementAnimationSpeed={decrementAnimationSpeed}
          />
          : <StepNavControls
            fwd={incrementStartDateTime}
            rev={decrementStartDateTime} />}
      </div>
    </>);
}
