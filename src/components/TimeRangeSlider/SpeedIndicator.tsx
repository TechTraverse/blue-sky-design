import { Box, FormControl, FormLabel, InputLabel, MenuItem, NativeSelect, Select } from "@mui/material";
import "./speedIndicator.css";
import { Duration } from 'effect';

const speedDescriptors: {
  label: string;
  value: number;
}[] = [{
  // 0
  label: '-1 hour/sec',
  value: -(Duration.toMillis(Duration.hours(1))),
}, {
  // 1
  label: '-30 min/sec',
  value: -(Duration.toMillis(Duration.minutes(30))),
}, {
  // 2
  label: '-10 min/sec',
  value: -(Duration.toMillis(Duration.minutes(10))),
}, {
  // 3
  label: '-5 min/sec',
  value: -(Duration.toMillis(Duration.minutes(5))),
}, {
  // 4
  label: '-1 min/sec',
  value: -(Duration.toMillis(Duration.minutes(1))),
}, {
  // 5
  label: '1 min/sec',
  value: Duration.toMillis(Duration.minutes(1)),
}, {
  // 6
  label: '5 min/sec',
  value: Duration.toMillis(Duration.minutes(5)),
}, {
  // 7
  label: '10 min/sec',
  value: Duration.toMillis(Duration.minutes(10)),
}, {
  // 8
  label: '30 min/sec',
  value: Duration.toMillis(Duration.minutes(30)),
}, {
  // 9
  label: '1 hour/sec',
  value: Duration.toMillis(Duration.hours(1)),
}];

export const SpeedIndicator = ({ disabled = true }: { disabled: boolean }) => {
  return (
    <div className={`speed-indicator ${disabled ? '' : 'enabled'}`}>
      <FormControl
        variant="standard" sx={{ m: 1 }}
        className="speed-indicator-select">
        <Select
          labelId="demo-simple-select-standard-label"
          id="demo-simple-select-standard"
          value={speedDescriptors[6].value}
          onChange={console.log}
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
