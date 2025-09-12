import { useState } from "react";
import { Popover, Typography, Box, Tooltip, FormControl, Select, MenuItem } from "@mui/material";
import { AnimationSpeed, TimeDuration } from "./timeSliderTypes";
import { Duration } from "effect";

// Speed options for animation
const speedOptions = Object.entries(AnimationSpeed)
  .filter(([key]) => isNaN(Number(key)))
  .map(([key, value]) => ({
    label: key,
    value: Number(value),
  }))
  .sort((a, b) => a.value - b.value);

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
  animationEnabled,
  animationSpeed,
  setAnimationSpeed,
  animationDuration,
  setAnimationDuration,
  rangeValue,
  setRange,
  disabled = false
}: {
  animationEnabled: boolean;
  animationSpeed?: AnimationSpeed;
  setAnimationSpeed?: (speed: AnimationSpeed) => void;
  animationDuration?: Duration.Duration;
  setAnimationDuration?: (duration: Duration.Duration) => void;
  rangeValue?: TimeDuration;
  setRange?: (timeDuration: TimeDuration) => void;
  disabled?: boolean;
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
  const title = animationEnabled ? 'Animation settings' : 'Step settings';
  const settingsTitle = animationEnabled ? 'Animation Settings' : 'Step Settings';

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
          style={{
            width: '20px',
            height: '20px',
            border: '1px solid #dae9f8',
            borderRadius: '50%',
            backgroundColor: '#f0f0f0',
            color: '#666',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.2s ease-in-out',
            padding: '0',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'default' : 'pointer',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#1976d2';
              e.currentTarget.style.color = '#1976d2';
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
              e.currentTarget.style.borderColor = '#dae9f8';
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.12)';
            }
          }}
        >
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 'bold',
            lineHeight: 1,
            letterSpacing: '1px',
            userSelect: 'none'
          }}>
            ⋯
          </span>
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
          sx: {
            p: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }
        }}
      >
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#555' }}>
            {settingsTitle}
          </Typography>
          
          {animationEnabled && animationSpeed && animationDuration ? (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                  Speed
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed?.(e.target.value as AnimationSpeed)}
                    variant="outlined"
                    MenuProps={{
                      sx: { zIndex: 10004 },
                      PaperProps: {
                        sx: { zIndex: 10004 }
                      }
                    }}
                  >
                    {speedOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
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
                    MenuProps={{
                      sx: { zIndex: 10004 },
                      PaperProps: {
                        sx: { zIndex: 10004 }
                      }
                    }}
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
          ) : (
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                Range/Step
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={rangeValue}
                  onChange={(e) => setRange?.(e.target.value as TimeDuration)}
                  variant="outlined"
                  MenuProps={{
                    sx: { zIndex: 10004 },
                    PaperProps: {
                      sx: { zIndex: 10004 }
                    }
                  }}
                >
                  {Object.entries(TimeDuration).map(([key, value]) => {
                    return isNaN(key as unknown as number) ? (
                      <MenuItem key={key} value={value}>
                        {key}
                      </MenuItem>
                    ) : null;
                  }).filter(Boolean)}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
};