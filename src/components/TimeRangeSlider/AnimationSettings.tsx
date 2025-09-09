import { useState } from "react";
import { IconButton, Popover, Typography, Box, Tooltip } from "@mui/material";
import { IoSettingsOutline } from "react-icons/io5";
import { SpeedIndicator } from "./SpeedIndicator";
import { DurationIndicator } from "./DurationIndicator";
import { AnimationSpeed } from "./timeSliderTypes";
import { Duration } from "effect";

export const AnimationSettings = ({
  animationSpeed,
  setAnimationSpeed,
  animationDuration,
  setAnimationDuration,
  disabled = false
}: {
  animationSpeed: AnimationSpeed;
  setAnimationSpeed?: (speed: AnimationSpeed) => void;
  animationDuration: Duration.Duration;
  setAnimationDuration?: (duration: Duration.Duration) => void;
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
  const id = open ? 'animation-settings-popover' : undefined;

  return (
    <>
      <Tooltip 
        title="Animation settings"
        PopperProps={{
          sx: { zIndex: 10003 }
        }}
      >
        <IconButton
          onClick={handleClick}
          disabled={disabled}
          size="small"
          sx={{
            width: 24,
            height: 24,
            border: '1px solid #dae9f8',
            borderRadius: '50%',
            backgroundColor: '#f8f9fa',
            color: '#666',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: '#fff',
              borderColor: '#1976d2',
              color: '#1976d2',
              transform: 'scale(1.1)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            },
            '& svg': {
              fontSize: '14px',
            }
          }}
        >
          <IoSettingsOutline />
        </IconButton>
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
            Animation Settings
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
              Speed
            </Typography>
            <SpeedIndicator
              disabled={false}
              animationSpeed={animationSpeed}
              setAnimationSpeed={setAnimationSpeed}
            />
          </Box>
          
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
              Duration
            </Typography>
            <DurationIndicator
              disabled={false}
              animationDuration={animationDuration}
              setAnimationDuration={setAnimationDuration}
            />
          </Box>
        </Box>
      </Popover>
    </>
  );
};