import { FormControl, MenuItem, Select } from "@mui/material";
import { Duration } from "effect";
import "./speedIndicator.css";

// Common animation duration options
const durationOptions = [
  { label: "30 minutes", value: Duration.minutes(30) },
  { label: "1 hour", value: Duration.hours(1) },
  { label: "2 hours", value: Duration.hours(2) },
  { label: "4 hours", value: Duration.hours(4) },
  { label: "6 hours", value: Duration.hours(6) },
  { label: "12 hours", value: Duration.hours(12) },
  { label: "1 day", value: Duration.days(1) },
];

export const DurationIndicator = ({ 
  disabled = true, 
  animationDuration, 
  setAnimationDuration 
}: { 
  disabled: boolean, 
  animationDuration: Duration.Duration, 
  setAnimationDuration?: (duration: Duration.Duration) => void 
}) => {
  const currentDurationMillis = Duration.toMillis(animationDuration);
  
  return (
    <div className={`speed-indicator ${disabled ? '' : 'enabled'}`}>
      <FormControl
        variant="standard" 
        sx={{ m: 1 }}
        className="speed-indicator-select"
      >
        <Select
          labelId="duration-select-label"
          id="duration-select"
          value={currentDurationMillis}
          onChange={(e) => {
            const selectedDuration = durationOptions.find(
              option => Duration.toMillis(option.value) === e.target.value
            );
            if (selectedDuration) {
              setAnimationDuration?.(selectedDuration.value);
            }
          }}
          size="small"
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
    </div>
  );
};