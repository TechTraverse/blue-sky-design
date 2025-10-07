import "./settingsPanel.css";
import { useState } from "react";
import { FaGear, FaXmark, FaGlobe, FaClock } from "react-icons/fa6";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Divider, 
  ToggleButton, 
  ToggleButtonGroup,
  Typography,
  Box,
  IconButton
} from "@mui/material";
import { AnimationOrStepMode, TimeDuration, Theme as AppTheme } from "./timeSliderTypes";
import { Duration } from "effect";

export interface SettingsPanelProps {
  // General settings
  timeZone: 'local' | 'utc';
  onTimeZoneChange: (timeZone: 'local' | 'utc') => void;
  theme: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  
  // Current mode
  currentMode: AnimationOrStepMode;
  
  // Step mode settings
  stepDuration?: Duration.Duration;
  onStepDurationChange?: (duration: Duration.Duration) => void;
  rangeValue?: TimeDuration;
  setRange?: (timeDuration: TimeDuration) => void;
  
  // Animation mode settings - we'll add these later when reorganizing
}

export const SettingsPanel = ({
  timeZone,
  onTimeZoneChange,
  theme,
  onThemeChange,
  currentMode,
  stepDuration,
  onStepDurationChange,
  rangeValue,
  setRange,
}: SettingsPanelProps) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      {/* Settings trigger button */}
      <IconButton 
        onClick={handleOpen}
        className="settings-trigger"
        aria-label="Open settings"
        size="small"
      >
        <FaGear size={14} />
      </IconButton>

      {/* Settings dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        className="settings-dialog"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="settings-dialog-title">
          <Typography variant="h6">Settings</Typography>
          <IconButton onClick={handleClose} size="small">
            <FaXmark size={12} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent className="settings-dialog-content">
          {/* General Settings */}
          <Box className="settings-section">
            <Typography variant="subtitle1" className="settings-section-title">
              General
            </Typography>
            
            {/* Timezone Setting */}
            <Box className="settings-item">
              <Typography variant="body2" className="settings-item-label">
                Timezone
              </Typography>
              <ToggleButtonGroup
                value={timeZone}
                exclusive
                onChange={(_, newTimeZone) => newTimeZone && onTimeZoneChange(newTimeZone)}
                size="small"
                className="settings-timezone-toggle"
              >
                <ToggleButton value="local" aria-label="Show times in local timezone">
                  <FaClock size={12} />
                  <span>Local</span>
                </ToggleButton>
                <ToggleButton value="utc" aria-label="Show times in UTC timezone">
                  <FaGlobe size={12} />
                  <span>UTC</span>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Theme Setting (if provided) */}
            {onThemeChange && (
              <Box className="settings-item">
                <Typography variant="body2" className="settings-item-label">
                  Theme
                </Typography>
                <ToggleButtonGroup
                  value={theme}
                  exclusive
                  onChange={(_, newTheme) => newTheme && onThemeChange(newTheme)}
                  size="small"
                  className="settings-theme-toggle"
                >
                  <ToggleButton value={AppTheme.Light} aria-label="Light theme">
                    Light
                  </ToggleButton>
                  <ToggleButton value={AppTheme.Dark} aria-label="Dark theme">
                    Dark
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Mode-specific Settings */}
          <Box className="settings-section">
            <Typography variant="subtitle1" className="settings-section-title">
              {currentMode === AnimationOrStepMode.Step ? 'Step Mode' : 'Animation Mode'} Settings
            </Typography>
            
            {currentMode === AnimationOrStepMode.Step && (
              <>
                {/* Step Duration Setting */}
                {setRange && (
                  <Box className="settings-item">
                    <Typography variant="body2" className="settings-item-label">
                      Step Duration
                    </Typography>
                    <ToggleButtonGroup
                      value={rangeValue}
                      exclusive
                      onChange={(_, newRange) => newRange && setRange(newRange)}
                      size="small"
                      className="settings-duration-toggle"
                    >
                      <ToggleButton value={TimeDuration['30 min']} aria-label="30 minutes">
                        30m
                      </ToggleButton>
                      <ToggleButton value={TimeDuration['1 hour']} aria-label="1 hour">
                        1h
                      </ToggleButton>
                      <ToggleButton value={TimeDuration['2 hours']} aria-label="2 hours">
                        2h
                      </ToggleButton>
                      <ToggleButton value={TimeDuration['4 hours']} aria-label="4 hours">
                        4h
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}
              </>
            )}

            {currentMode === AnimationOrStepMode.Animation && (
              <Box className="settings-item">
                <Typography variant="body2" color="textSecondary">
                  Animation settings will be moved here in a future update.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};