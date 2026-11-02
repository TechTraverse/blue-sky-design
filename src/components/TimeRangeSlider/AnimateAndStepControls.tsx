import "./animateAndStepControls.css";
import { TbPlayerPause, TbPlayerPlay } from "react-icons/tb";
import { Button, Tooltip } from "@mui/material";
import { AnimationSpeed } from "./timeSliderTypes";
import { MdFirstPage, MdLastPage } from "react-icons/md";
import { ControlSettings } from "./ControlSettings";
import { Duration } from "effect";

/**
 * Step back, play/pause, step forward, and the playback settings. Stepping and
 * playing work side by side: a step pauses playback where it lands.
 */
export const AnimateAndStepControls = ({
  playing = false,
  setPlaying = () => { },
  animationSpeed,
  setAnimationSpeed,
  animationDuration,
  setAnimationDuration,
  incrementStartDateTime,
  decrementStartDateTime,
  disableStepForward = false,
  disableStepBackward = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  incrementAnimationSpeed,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decrementAnimationSpeed,
  hidePlayback = false,
  disabledPlaybackTooltip,
  frameIntervalMs,
  setFrameIntervalMs,
  darkTheme = false,
}: {
  playing?: boolean,
  setPlaying?: (playing: boolean) => void,
  animationSpeed: AnimationSpeed,
  setAnimationSpeed?: (speed: AnimationSpeed) => void,
  animationDuration?: Duration.Duration,
  setAnimationDuration?: (duration: Duration.Duration) => void,
  incrementStartDateTime?: () => void,
  decrementStartDateTime?: () => void,
  /** Step is at the end of the selectable range; the button reads as disabled. */
  disableStepForward?: boolean,
  disableStepBackward?: boolean,
  incrementAnimationSpeed?: () => void,
  decrementAnimationSpeed?: () => void,
  /** Hides play and the playback settings, leaving the step buttons. */
  hidePlayback?: boolean,
  /** When provided, shows the play button disabled, with this tooltip message. */
  disabledPlaybackTooltip?: string,
  /** Instant mode's frame interval; replaces the speed setting with a frame rate. */
  frameIntervalMs?: number,
  setFrameIntervalMs?: (ms: number) => void,
  /** Themes the settings popover, which renders outside the slider. */
  darkTheme?: boolean,
}) => {
  const playDisabled = disabledPlaybackTooltip !== undefined;
  const playLabel = playing ? "Pause" : "Play";

  return (
    <div className="playback-section playback-section-relative">
      <div className={`unified-control-panel${hidePlayback ? ' compressed' : ''}`}>
        <div className="playback-button-container">
          <Button
            variant="contained"
            onClick={() => decrementStartDateTime?.()}
            disabled={disableStepBackward}
            aria-label="Step back"
            title="Step back"
          >
            <MdFirstPage />
          </Button>

          {!hidePlayback && (
            <Tooltip
              title={disabledPlaybackTooltip ?? playLabel}
              PopperProps={{ sx: { zIndex: 10003 } }}
            >
              {/* A disabled button fires no events, so the span carries the tooltip. */}
              <span className="center-button-container">
                <Button
                  variant="contained"
                  className="center-btn"
                  onClick={() => setPlaying(!playing)}
                  disabled={playDisabled}
                  aria-label={playLabel}
                >
                  {playing ? <TbPlayerPause /> : <TbPlayerPlay />}
                </Button>
              </span>
            </Tooltip>
          )}

          <Button
            variant="contained"
            onClick={() => incrementStartDateTime?.()}
            disabled={disableStepForward}
            aria-label="Step forward"
            title="Step forward"
          >
            <MdLastPage />
          </Button>
        </div>

        {!hidePlayback && (
          <div className="control-section settings-section">
            <div className="control-settings-inline">
              <ControlSettings
                animationSpeed={animationSpeed}
                setAnimationSpeed={setAnimationSpeed}
                animationDuration={animationDuration}
                setAnimationDuration={setAnimationDuration}
                frameIntervalMs={frameIntervalMs}
                setFrameIntervalMs={setFrameIntervalMs}
                disabled={false}
                darkTheme={darkTheme}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
