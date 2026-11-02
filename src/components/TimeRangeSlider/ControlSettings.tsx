import { useState } from "react";
import { Popover, Typography, Box, Tooltip, FormControl, Select, MenuItem } from "@mui/material";
import { AnimationSpeed } from "./timeSliderTypes";
import { Duration } from "effect";

// Speed options for animation
const speedOptions = Object.entries(AnimationSpeed)
  .filter(([key]) => isNaN(Number(key)))
  .map(([key, value]) => ({
    label: key,
    value: Number(value),
  }))
  .sort((a, b) => a.value - b.value);

// Frame rates for instant mode, where each frame is one step
const frameRatesFps = [0.5, 1, 2, 4];

/** Frame-rate choices as frame intervals, including `currentMs` so the select always has a value. */
const frameIntervalOptions = (currentMs: number) =>
  [...new Set([...frameRatesFps.map((fps) => 1000 / fps), currentMs])]
    .sort((a, b) => b - a)
    .map((ms) => ({ label: `${+(1000 / ms).toFixed(2)} fps`, value: ms }));

// Duration options for animation
const durationOptions = [
  { label: "30 minutes", value: Duration.minutes(30) },
  { label: "1 hour", value: Duration.hours(1) },
  { label: "2 hours", value: Duration.hours(2) },
  { label: "4 hours", value: Duration.hours(4) },
  { label: "6 hours", value: Duration.hours(6) },
  { label: "12 hours", value: Duration.hours(12) },
  { label: "1 day", value: Duration.days(1) },
];

export const ControlSettings = ({
  animationSpeed,
  setAnimationSpeed,
  animationDuration,
  setAnimationDuration,
  frameIntervalMs,
  setFrameIntervalMs,
  disabled = false,
  darkTheme = false,
}: {
  animationSpeed?: AnimationSpeed;
  setAnimationSpeed?: (speed: AnimationSpeed) => void;
  animationDuration?: Duration.Duration;
  setAnimationDuration?: (duration: Duration.Duration) => void;
  /**
   * Instant mode: every frame advances one step, so the speed select becomes a
   * frame rate (this interval) plus a direction (the sign of `animationSpeed`).
   */
  frameIntervalMs?: number;
  setFrameIntervalMs?: (ms: number) => void;
  disabled?: boolean;
  /**
   * The popover and its menus render in a portal outside the slider, so they
   * take the slider's theme class themselves.
   */
  darkTheme?: boolean;
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'control-settings-popover' : undefined;
  const title = 'Playback settings';
  const settingsTitle = 'Playback Settings';
  const themeClass = darkTheme ? 'dark-theme' : 'light-theme';
  const menuProps = { className: themeClass, sx: { zIndex: 10004 } };

  return (
    <>
      <Tooltip 
        title={title}
        PopperProps={{
          sx: { zIndex: 10003 }
        }}
      >
        <button
          onClick={handleClick}
          disabled={disabled}
          className="control-settings-button"
        >
          ⋯
        </button>
      </Tooltip>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        sx={{
          zIndex: 10002,
        }}
        PaperProps={{
          className: `control-settings-paper ${themeClass}`,
          sx: { p: 2, borderRadius: '8px' },
        }}
      >
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="subtitle2" className="control-settings-title" sx={{ mb: 2, fontWeight: 600 }}>
            {settingsTitle}
          </Typography>
          
          {animationSpeed && animationDuration && (
            <>
              {frameIntervalMs === undefined ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" className="control-settings-label" sx={{ display: 'block', mb: 1 }}>
                    Speed
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={animationSpeed}
                      onChange={(e) => setAnimationSpeed?.(e.target.value as AnimationSpeed)}
                      variant="outlined"
                      MenuProps={menuProps}
                    >
                      {speedOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" className="control-settings-label" sx={{ display: 'block', mb: 1 }}>
                      Frame rate
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={frameIntervalMs}
                        onChange={(e) => setFrameIntervalMs?.(Number(e.target.value))}
                        variant="outlined"
                        MenuProps={menuProps}
                      >
                        {frameIntervalOptions(frameIntervalMs).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" className="control-settings-label" sx={{ display: 'block', mb: 1 }}>
                      Direction
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={animationSpeed < 0 ? -1 : 1}
                        onChange={(e) => {
                          const direction = Number(e.target.value);
                          if (Math.sign(animationSpeed) !== direction) {
                            setAnimationSpeed?.(-animationSpeed as AnimationSpeed);
                          }
                        }}
                        variant="outlined"
                        MenuProps={menuProps}
                      >
                        <MenuItem value={1}>Forward</MenuItem>
                        <MenuItem value={-1}>Reverse</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </>
              )}

              <Box>
                <Typography variant="caption" className="control-settings-label" sx={{ display: 'block', mb: 1 }}>
                  Duration
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={Duration.toMillis(animationDuration)}
                    onChange={(e) => {
                      const selectedDuration = durationOptions.find(
                        option => Duration.toMillis(option.value) === e.target.value
                      );
                      if (selectedDuration) {
                        setAnimationDuration?.(selectedDuration.value);
                      }
                    }}
                    variant="outlined"
                    MenuProps={menuProps}
                  >
                    {durationOptions.map((option) => (
                      <MenuItem key={Duration.toMillis(option.value)} value={Duration.toMillis(option.value)}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};