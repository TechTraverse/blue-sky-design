import { FormControl, MenuItem, Select } from "@mui/material";
import "./speedIndicator.css";
import { AnimationSpeed } from "./timeSliderTypes";

const speedDescriptors: {
  label: string;
  value: number;
}[] = Object.entries(AnimationSpeed)
  .filter(([key]) => isNaN(Number(key)))
  .map(([key, value]) => ({
    label: key,
    value: Number(value),
  }))
  .sort((a, b) => a.value - b.value);

export const SpeedIndicator = ({ disabled = true, animationSpeed, setAnimationSpeed }: { disabled: boolean, animationSpeed: AnimationSpeed, setAnimationSpeed?: (speed: AnimationSpeed) => void }) => {
  return (
    <div className={`speed-indicator ${disabled ? '' : 'enabled'}`}>
      <FormControl
        variant="standard" sx={{ m: 1 }}
        className="speed-indicator-select">
        <Select
          labelId="demo-simple-select-standard-label"
          id="demo-simple-select-standard"
          value={animationSpeed}
          onChange={(e) => {
            setAnimationSpeed?.(e.target.value as AnimationSpeed)
          }}
          size="small"
        >
          {
            speedDescriptors.map((descriptor) => (
              <MenuItem key={descriptor.value} value={descriptor.value}>
                {descriptor.label}
              </MenuItem>
            ))
          }
        </Select>
      </FormControl>
    </div>
  );
}
