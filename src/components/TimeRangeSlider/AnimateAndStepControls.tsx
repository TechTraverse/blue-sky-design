import "./animateAndStepControls.css";
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Button, Tooltip } from "@mui/material";
import { AnimationSpeed, PlayMode, TimeDuration } from "./timeSliderTypes";
import { MdFirstPage, MdLastPage } from "react-icons/md";
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
        <div className="unified-control-panel">
          {/* Mode Section */}
          <div className="control-section mode-section">
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
          </div>

          {/* Playback Controls */}
          <div className={`playback-button-container ${animationEnabled ? 'animation-mode' : 'step-mode'}`}>
            <Button
              variant="contained"
              onClick={() => animationEnabled ? decrementAnimationSpeed?.() : decrementStartDateTime?.()}
              sx={{
                transition: 'all 0.3s ease',
                width: animationEnabled ? '44px' : '67px', // Wider when in step mode
                flex: '0 0 auto'
              }}
            >
              {animationEnabled ? <MdFirstPage /> : <TbPlayerSkipBack />}
            </Button>

            {/* Always reserve space for center button */}
            <div className="center-button-container">
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
            </div>

            <Button
              variant="contained"
              onClick={() => animationEnabled ? incrementAnimationSpeed?.() : incrementStartDateTime?.()}
              sx={{
                transition: 'all 0.3s ease',
                width: animationEnabled ? '44px' : '67px', // Wider when in step mode
                flex: '0 0 auto'
              }}
            >
              {animationEnabled ? <MdLastPage /> : <TbPlayerSkipForward />}
            </Button>
          </div>

          {/* Settings Section */}
          <div className="control-section settings-section">
            <div className="control-settings-inline">
              <ControlSettings
                animationEnabled={animationEnabled}
                animationSpeed={animationSpeed}
                setAnimationSpeed={setAnimationSpeed}
                animationDuration={animationDuration}
                setAnimationDuration={setAnimationDuration}
                disabled={false}
              />
            </div>
          </div>
        </div>
      </div>
    </>);
}
