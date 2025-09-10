import "./rangeDateInput.css";
import { TbPlayerPause, TbPlayerPlay, TbPlayerSkipBack, TbPlayerSkipForward } from "react-icons/tb";
import { Button, Tooltip } from "@mui/material";
import { AnimationSpeed, PlayMode } from "./timeSliderTypes";
import { FiFastForward, FiRewind } from "react-icons/fi";
import { MdPlayArrow, MdSkipNext } from "react-icons/md";
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
      <div className={`playback-section ${animationEnabled ? "animate" : "step"}`} style={{ position: 'relative' }}>
        <div className="playback-nav-controls">
          {/* Micro Toggle Switch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: '12px',
            gap: '4px',
            flex: '0 0 auto' // Prevent flex shrinking/growing
          }}>
            <Tooltip 
              title={`${animationEnabled ? 'Animation' : 'Step'} mode - Click to switch`}
              PopperProps={{
                sx: { zIndex: 10003 }
              }}
            >
              <div
                onClick={handleModeToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '12px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Step Mode */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: !animationEnabled ? '#1976d2' : '#f0f0f0',
                    color: !animationEnabled ? 'white' : '#999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    transform: !animationEnabled ? 'scale(1.1)' : 'scale(1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    fontFamily: 'Arial, sans-serif'
                  }}
                  title="Step Mode"
                >
                  S
                </div>
                
                {/* Animation Mode */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: animationEnabled ? '#4caf50' : '#f0f0f0',
                    color: animationEnabled ? 'white' : '#999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    transform: animationEnabled ? 'scale(1.1)' : 'scale(1)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    fontFamily: 'Arial, sans-serif'
                  }}
                  title="Animation Mode"
                >
                  A
                </div>
              </div>
            </Tooltip>
          </div>

          {/* Button container with fixed layout */}
          <div style={{
            display: 'flex',
            gap: '7px',
            flex: '1 1 auto',
            justifyContent: 'center'
          }}>
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
