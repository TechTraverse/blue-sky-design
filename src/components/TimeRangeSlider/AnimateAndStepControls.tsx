import "./animateAndStepControls.css";
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Button, Tooltip } from "@mui/material";
import { AnimationSpeed, PlayMode, TimeDuration } from "./timeSliderTypes";
import { FiFastForward, FiRewind } from "react-icons/fi";
import { ControlSettings } from "./ControlSettings";
import { Duration } from "effect";

export const AnimateAndStepControls = ({
  animationEnabled = false,
  setAnimationEnabled = () => { },
  playMode,
  setPlayMode,
  animationSpeed,
  setAnimationSpeed,
  animationDuration,
  setAnimationDuration,
  rangeValue,
  setRange,
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
  rangeValue?: TimeDuration,
  setRange?: (timeDuration: TimeDuration) => void,
  incrementStartDateTime?: () => void,
  decrementStartDateTime?: () => void,
  incrementAnimationSpeed?: () => void,
  decrementAnimationSpeed?: () => void,
}) => {

  const handleCenterButtonClick = () => {
    if (animationEnabled) {
      // In animate mode: toggle play/pause
      setPlayMode?.(playMode === PlayMode.Play ? PlayMode.Pause : PlayMode.Play);
    }
    // Mode switching now handled by toggle switch
  };

  const handleModeToggle = () => {
    setAnimationEnabled(!animationEnabled);
    if (!animationEnabled) {
      // Switching to animation mode - start playing
      setPlayMode?.(PlayMode.Play);
    }
  };

  return (
    <>
      <div className={`playback-section ${animationEnabled ? "animate" : "step"} playback-section-relative`}>
        <div className="playback-nav-controls">
          {/* Micro Toggle Switch */}
          <div className="playback-toggle-container">
            <Tooltip
              title={`${animationEnabled ? 'Animation' : 'Step'} mode active - Click to switch to ${animationEnabled ? 'Step' : 'Animation'}`}
              PopperProps={{
                sx: { zIndex: 10003 }
              }}
            >
              <div
                onClick={handleModeToggle}
                className="playback-toggle-switch"
              >
                {/* Step Mode */}
                <div
                  className={`playback-toggle-step${!animationEnabled ? ' active' : ''}`}
                  title="Step Mode"
                >
                  S
                </div>

                {/* Animation Mode */}
                <div
                  className={`playback-toggle-animate${animationEnabled ? ' active' : ''}`}
                  title="Animation Mode"
                >
                  A
                </div>
              </div>
            </Tooltip>
          </div>

          {/* Button container with fixed layout */}
          <div className="playback-button-container">
            <Button
              variant="contained"
              onClick={() => animationEnabled ? decrementAnimationSpeed?.() : decrementStartDateTime?.()}
              sx={{
                transition: 'all 0.3s ease',
                width: animationEnabled ? '44px' : '66px', // Wider when in step mode
                flex: '0 0 auto'
              }}
            >
              {animationEnabled ? <FiRewind /> : <TbPlayerSkipBack />}
            </Button>

            {animationEnabled && (
              <Tooltip
                title={playMode === PlayMode.Play ? "Pause" : "Play"}
                PopperProps={{
                  sx: { zIndex: 10003 }
                }}
              >
                <Button
                  variant="contained"
                  onClick={handleCenterButtonClick}
                  sx={{
                    backgroundColor: playMode === PlayMode.Play ? '#1976d2' : undefined,
                    '&:hover': {
                      backgroundColor: playMode === PlayMode.Play ? '#1565c0' : undefined,
                    },
                    transition: 'all 0.3s ease',
                    width: '44px',
                    flex: '0 0 auto'
                  }}
                >
                  {playMode === PlayMode.Play ? <TbPlayerPause /> : <TbPlayerPlay />}
                </Button>
              </Tooltip>
            )}

            <Button
              variant="contained"
              onClick={() => animationEnabled ? incrementAnimationSpeed?.() : incrementStartDateTime?.()}
              sx={{
                transition: 'all 0.3s ease',
                width: animationEnabled ? '44px' : '66px', // Wider when in step mode
                flex: '0 0 auto'
              }}
            >
              {animationEnabled ? <FiFastForward /> : <TbPlayerSkipForward />}
            </Button>
          </div>
        </div>

        <div className={animationEnabled ? "animation-settings-container" : "step-settings-container"}>
          <ControlSettings
            animationEnabled={animationEnabled}
            animationSpeed={animationSpeed}
            setAnimationSpeed={setAnimationSpeed}
            animationDuration={animationDuration}
            setAnimationDuration={setAnimationDuration}
            rangeValue={rangeValue}
            setRange={setRange}
            disabled={false}
          />
        </div>
      </div>
    </>);
}
