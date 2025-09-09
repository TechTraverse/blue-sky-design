import "./rangeDateInput.css";
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Button, Tooltip } from "@mui/material";
import { AnimationSpeed, PlayMode } from "./timeSliderTypes";
import { FiFastForward, FiRewind } from "react-icons/fi";
import { AnimationSettings } from "./AnimationSettings";
import { Duration } from "effect";

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
  animationDuration,
  setAnimationDuration,
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
  setAnimationSpeed?: (speed: AnimationSpeed) => void,
  animationDuration?: Duration.Duration,
  setAnimationDuration?: (duration: Duration.Duration) => void,
  incrementStartDateTime?: () => void,
  decrementStartDateTime?: () => void,
  incrementAnimationSpeed?: () => void,
  decrementAnimationSpeed?: () => void,
}) => {

  const handleCenterButtonClick = () => {
    if (animationEnabled) {
      // In animate mode: toggle play/pause
      setPlayMode?.(playMode === PlayMode.Play ? PlayMode.Pause : PlayMode.Play);
    } else {
      // In step mode: switch to animate mode
      setAnimationEnabled(true);
    }
  };

  const handleCenterButtonDoubleClick = () => {
    if (animationEnabled) {
      // Double click in animate mode: switch to step mode
      setAnimationEnabled(false);
    }
  };

  return (
    <>
      <div className={`playback-section ${animationEnabled ? "animate" : "step"}`} style={{ position: 'relative' }}>
        <div className="playback-nav-controls">
          <Button 
            variant="contained" 
            onClick={() => animationEnabled ? decrementAnimationSpeed?.() : decrementStartDateTime?.()}
          >
            {animationEnabled ? <FiRewind /> : <TbPlayerSkipBack />}
          </Button>
          
          <Tooltip 
            title={
              animationEnabled 
                ? playMode === PlayMode.Play 
                  ? "Pause (double-click for step mode)"
                  : "Play (double-click for step mode)"
                : "Switch to animation mode"
            }
            PopperProps={{
              sx: { zIndex: 10003 }
            }}
          >
            <Button
              variant="contained"
              onClick={handleCenterButtonClick}
              onDoubleClick={handleCenterButtonDoubleClick}
              sx={{
                backgroundColor: animationEnabled && playMode === PlayMode.Play ? '#1976d2' : undefined,
                '&:hover': {
                  backgroundColor: animationEnabled && playMode === PlayMode.Play ? '#1565c0' : undefined,
                }
              }}
            >
              {animationEnabled 
                ? (playMode === PlayMode.Play ? <TbPlayerPause /> : <TbPlayerPlay />)
                : <TbPlayerPlay />
              }
            </Button>
          </Tooltip>

          <Button 
            variant="contained" 
            onClick={() => animationEnabled ? incrementAnimationSpeed?.() : incrementStartDateTime?.()}
          >
            {animationEnabled ? <FiFastForward /> : <TbPlayerSkipForward />}
          </Button>
        </div>

        {animationEnabled && animationDuration && (
          <div style={{
            position: 'absolute',
            top: -12,
            right: 10,
            zIndex: 10001
          }}>
            <AnimationSettings
              animationSpeed={animationSpeed}
              setAnimationSpeed={setAnimationSpeed}
              animationDuration={animationDuration}
              setAnimationDuration={setAnimationDuration}
              disabled={false}
            />
          </div>
        )}
      </div>
    </>);
}
